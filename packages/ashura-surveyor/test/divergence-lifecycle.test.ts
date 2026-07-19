import { describe, expect, test } from 'vitest';
import { checkEscalation, detect, enterWaitingForVerdict, resolve } from '../src/divergence-lifecycle.js';

const T0 = 1_700_000_000_000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

describe('divergence-lifecycle (正常系)', () => {
  test('検出 -> 裁定待ち -> 解消(コードを直す)', () => {
    const detected = detect('d-1', T0);
    expect(detected.state).toBe('検出');

    const waiting = enterWaitingForVerdict(detected, T0 + ONE_DAY_MS);
    expect(waiting.state).toBe('裁定待ち');
    expect(waiting.waitingSince).toBe(T0 + ONE_DAY_MS);

    const resolved = resolve(waiting, 'コードを直す', T0 + 2 * ONE_DAY_MS);
    expect(resolved.state).toBe('解消');
    expect(resolved.verdict).toBe('コードを直す');
  });

  test('検出 -> 裁定待ち -> 解消(モデルを直す)', () => {
    const detected = detect('d-2', T0);
    const waiting = enterWaitingForVerdict(detected, T0);
    const resolved = resolve(waiting, 'モデルを直す', T0 + ONE_DAY_MS);
    expect(resolved.verdict).toBe('モデルを直す');
  });

  test('裁定待ちが7日以内ならエスカレーションしない', () => {
    const waiting = enterWaitingForVerdict(detect('d-3', T0), T0);
    const checked = checkEscalation(waiting, T0 + 6 * ONE_DAY_MS);
    expect(checked.escalated).toBe(false);
  });
});

describe('divergence-lifecycle (異常系)', () => {
  test('検出 -> 解消への直接遷移は禁止', () => {
    const detected = detect('d-4', T0);
    expect(() => resolve(detected, 'コードを直す', T0)).toThrow();
  });

  test('裁定待ちが7日を超えたらエスカレーションする', () => {
    const waiting = enterWaitingForVerdict(detect('d-5', T0), T0);
    const checked = checkEscalation(waiting, T0 + 7 * ONE_DAY_MS + 1);
    expect(checked.escalated).toBe(true);
  });

  test('7日ちょうどはエスカレーションしない(超えたら、の境界)', () => {
    const waiting = enterWaitingForVerdict(detect('d-6', T0), T0);
    const checked = checkEscalation(waiting, T0 + 7 * ONE_DAY_MS);
    expect(checked.escalated).toBe(false);
  });
});
