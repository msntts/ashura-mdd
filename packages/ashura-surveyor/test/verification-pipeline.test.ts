import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createAshuraServices, type Model } from 'ashura-core';
import { EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import { describe, expect, test } from 'vitest';
import { runVerification, type CounterexampleSearch, type ObservationResult } from '../src/observation.js';
import { enumerateVerificationTasks } from '../src/verification-task.js';

const sugorokuPath = fileURLToPath(new URL('../../ashura-core/examples/sugoroku.ashura', import.meta.url));
const sugorokuSource = readFileSync(sugorokuPath, 'utf-8');

async function parseSugoroku(): Promise<Model> {
  const services = createAshuraServices(EmptyFileSystem).Ashura;
  const parse = parseHelper<Model>(services);
  const document = await parse(sugorokuSource, { documentUri: sugorokuPath, validation: true });
  expect(document.parseResult.lexerErrors).toHaveLength(0);
  expect(document.parseResult.parserErrors).toHaveLength(0);
  return document.parseResult.value;
}

function allPassSearch(): CounterexampleSearch {
  return { search: (task) => ({ task, outcome: '合格' }) };
}

describe('検証パイプライン統合(sugoroku.ashura): パース→タスク列挙→観測→集約', () => {
  test('性質4件・失敗セマンティクス2件が実際のASTから過不足なく列挙される', async () => {
    const model = await parseSugoroku();
    const tasks = enumerateVerificationTasks(model);

    const properties = tasks.filter((task) => task.kind === '性質').map((task) => task.name);
    const dependencies = tasks.filter((task) => task.kind === '失敗セマンティクス').map((task) => task.name);

    expect(properties.sort()).toEqual(['停止性', '公平性', '非決定性の閉包', '履歴再現性'].sort());
    expect(dependencies.sort()).toEqual(['効果音サービス', '対戦記録サービス'].sort());
  });

  test('全タスク合格なら観測結果確定はallPassed=true', async () => {
    const model = await parseSugoroku();
    const tasks = enumerateVerificationTasks(model);

    const summary = runVerification(tasks, allPassSearch());

    expect(summary.allPassed).toBe(true);
    expect(summary.results).toHaveLength(tasks.length);
  });

  test('性質のうち1件でも反例が見つかれば観測結果確定はallPassed=false', async () => {
    const model = await parseSugoroku();
    const tasks = enumerateVerificationTasks(model);

    const search: CounterexampleSearch = {
      search: (task): ObservationResult =>
        task.name === '公平性'
          ? { task, outcome: '反例', counterexample: '手番スキップ後に巡回順が崩れる出目系列が存在する' }
          : { task, outcome: '合格' },
    };
    const summary = runVerification(tasks, search);

    expect(summary.allPassed).toBe(false);
    expect(summary.results.filter((result) => result.outcome === '反例')).toHaveLength(1);
  });
});
