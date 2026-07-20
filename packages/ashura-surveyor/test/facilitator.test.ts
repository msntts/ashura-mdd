import { describe, expect, test } from 'vitest';
import { analyzeGaps } from '../src/facilitator.js';
import { NO_FORBIDDEN_TRANSITION_FIXTURE } from './support/fixtures.js';
import { parseFixture } from './support/parse-fixture.js';
import { parseSugoroku } from './support/parse-sugoroku.js';

describe('analyzeGaps', () => {
  test('禁止遷移が宣言されている集約には質問しない(sugoroku.ashura)', async () => {
    const model = await parseSugoroku();
    const questions = analyzeGaps(model);

    expect(questions).toHaveLength(0);
  });

  test('禁止遷移が0件の集約には質問を生成する', async () => {
    const model = await parseFixture(NO_FORBIDDEN_TRANSITION_FIXTURE);
    const questions = analyzeGaps(model);

    expect(questions).toEqual([
      { scope: 'サンプル集約', topic: '禁止遷移', question: expect.stringContaining('サンプル集約') },
    ]);
  });
});
