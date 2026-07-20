import { describe, expect, test } from 'vitest';
import { runVerification, type CounterexampleSearch, type ObservationResult } from '../src/observation.js';
import type { VerificationTask } from '../src/verification-task.js';

function fixtureSearch(outcomes: ReadonlyMap<string, ObservationResult>): CounterexampleSearch {
  return {
    search: (task) => outcomes.get(task.name) ?? { task, outcome: '合格' },
  };
}

describe('runVerification', () => {
  test('全タスクが合格なら allPassed=true', () => {
    const tasks: VerificationTask[] = [
      { kind: '性質', name: '停止性', declaration: '任意の出目系列に対し有限手数で終了に到達する' },
      { kind: '失敗セマンティクス', name: '効果音サービス', declaration: '任意, 失敗時: 無音で続行' },
    ];
    const summary = runVerification(tasks, fixtureSearch(new Map()));

    expect(summary.allPassed).toBe(true);
    expect(summary.results).toHaveLength(2);
  });

  test('反例が1件でもあれば allPassed=false', () => {
    const tasks: VerificationTask[] = [
      { kind: '性質', name: '停止性', declaration: '任意の出目系列に対し有限手数で終了に到達する' },
      { kind: '性質', name: '公平性', declaration: '手番交代はプレイヤー列の巡回順に一致する' },
    ];
    const search = fixtureSearch(
      new Map([
        [
          '公平性',
          { task: tasks[1], outcome: '反例', counterexample: '手番スキップ後に巡回順が崩れる出目系列が存在する' },
        ],
      ]),
    );
    const summary = runVerification(tasks, search);

    expect(summary.allPassed).toBe(false);
    const counterexamples = summary.results.filter((result) => result.outcome === '反例');
    expect(counterexamples).toHaveLength(1);
    expect(counterexamples[0].counterexample).toBeDefined();
  });

  test('タスクが0件なら allPassed=true(検証すべき性質がない)', () => {
    const summary = runVerification([], fixtureSearch(new Map()));

    expect(summary.allPassed).toBe(true);
    expect(summary.results).toHaveLength(0);
  });
});
