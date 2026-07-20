import { beforeAll, describe, expect, test } from 'vitest';
import { runVerification, type CounterexampleSearch, type ObservationResult } from '../src/observation.js';
import { enumerateVerificationTasks, type VerificationTask } from '../src/verification-task.js';
import { parseSugoroku } from './support/parse-sugoroku.js';

function allPassSearch(): CounterexampleSearch {
  return { search: (task) => ({ task, outcome: '合格' }) };
}

describe('検証パイプライン統合(sugoroku.ashura): パース→タスク列挙→観測→集約', () => {
  let tasks: readonly VerificationTask[];

  beforeAll(async () => {
    const model = await parseSugoroku();
    tasks = enumerateVerificationTasks(model);
  });

  test('性質4件・失敗セマンティクス2件が実際のASTから過不足なく列挙される', () => {
    const properties = tasks.filter((task) => task.kind === '性質').map((task) => task.name);
    const dependencies = tasks.filter((task) => task.kind === '失敗セマンティクス').map((task) => task.name);

    expect(properties.sort()).toEqual(['停止性', '公平性', '非決定性の閉包', '履歴再現性'].sort());
    expect(dependencies.sort()).toEqual(['効果音サービス', '対戦記録サービス'].sort());
  });

  test('全タスク合格なら観測結果確定はallPassed=true', () => {
    const summary = runVerification(tasks, allPassSearch());

    expect(summary.allPassed).toBe(true);
    expect(summary.results).toHaveLength(tasks.length);
  });

  test('性質のうち1件でも反例が見つかれば観測結果確定はallPassed=false', () => {
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
