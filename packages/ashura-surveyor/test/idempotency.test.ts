import { describe, expect, test } from 'vitest';
import { checkIdempotency } from '../src/idempotency.js';
import type { CounterexampleSearch } from '../src/observation.js';
import type { VerificationTask } from '../src/verification-task.js';

const tasks: VerificationTask[] = [
  { kind: '性質', name: '停止性', declaration: '任意の出目系列に対し有限手数で終了に到達する' },
  { kind: '性質', name: '公平性', declaration: '手番交代はプレイヤー列の巡回順に一致する' },
];

function allPassSearch(): CounterexampleSearch {
  return { search: (task) => ({ task, outcome: '合格' }) };
}

function withCounterexample(taskName: string): CounterexampleSearch {
  return {
    search: (task) =>
      task.name === taskName ? { task, outcome: '反例', counterexample: '反例あり' } : { task, outcome: '合格' },
  };
}

describe('checkIdempotency', () => {
  test('コードバイトが異なる想定でも検証結果集合が一致すれば冪等(equivalent: true)', () => {
    // 1回目・2回目それぞれ別の CounterexampleSearch(=別の生成コードに対する検証)を渡すが、
    // 結果は両方とも全タスク合格なのでバイト同一を要求せず等価とみなせる
    const result = checkIdempotency(tasks, allPassSearch(), allPassSearch());

    expect(result.equivalent).toBe(true);
  });

  test('検証結果が食い違えば冪等ではない(equivalent: false)', () => {
    const result = checkIdempotency(tasks, allPassSearch(), withCounterexample('公平性'));

    expect(result.equivalent).toBe(false);
    expect(result.first.allPassed).toBe(true);
    expect(result.second.allPassed).toBe(false);
  });

  test('タスクが0件なら常に冪等(空虚な真)', () => {
    const result = checkIdempotency([], allPassSearch(), withCounterexample('公平性'));

    expect(result.equivalent).toBe(true);
  });
});
