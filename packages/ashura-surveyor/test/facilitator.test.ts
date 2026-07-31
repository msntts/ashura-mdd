import { isAggregate, type Model } from 'ashura-core';
import { describe, expect, test } from 'vitest';
import {
  analyzeGaps,
  applyAnswer,
  type DialogueAgent,
  type DialogueAnswer,
  type DialogueQuestion,
  type FacilitationQuestion,
} from '../src/facilitator.js';
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

const fixtureDialogueAgent: DialogueAgent = {
  async askFailureModeQuestions(model: Model): Promise<readonly DialogueQuestion[]> {
    return model.elements
      .filter(isAggregate)
      .map((element) => ({
        scope: element.name,
        topic: '失敗系',
        question: `集約「${element.name}」で想定される失敗系はありますか?`,
      }));
  },
  async answer(_question: FacilitationQuestion): Promise<DialogueAnswer> {
    return { declarationText: '禁止 完了 -> 開始' };
  },
};

describe('対話ループ(DialogueAgent seam)', () => {
  test('禁止遷移0件の草稿→質問→回答→草稿更新→再測量で0件になる(閉ループ)', async () => {
    const draftModel = await parseFixture(NO_FORBIDDEN_TRANSITION_FIXTURE);
    const questions = analyzeGaps(draftModel);
    expect(questions).toHaveLength(1);

    const answer = await fixtureDialogueAgent.answer(questions[0]);
    const updatedModel = await applyAnswer(NO_FORBIDDEN_TRANSITION_FIXTURE, questions[0], answer);

    expect(analyzeGaps(updatedModel)).toHaveLength(0);
  });

  test('失敗系トピックの質問生成(型と生成のみ確認、閉ループには含めない)', async () => {
    const model = await parseFixture(NO_FORBIDDEN_TRANSITION_FIXTURE);
    const questions = await fixtureDialogueAgent.askFailureModeQuestions(model);

    expect(questions).toEqual([
      { scope: 'サンプル集約', topic: '失敗系', question: expect.stringContaining('サンプル集約') },
    ]);
  });

  test('想定形式(禁止 <状態> -> <状態>)と一致しない回答は拒否する', async () => {
    const draftModel = await parseFixture(NO_FORBIDDEN_TRANSITION_FIXTURE);
    const questions = analyzeGaps(draftModel);

    const maliciousAnswer: DialogueAnswer = {
      declarationText: '禁止 完了 -> 開始 }\n集約 侵入集約 { 状態: X',
    };

    await expect(applyAnswer(NO_FORBIDDEN_TRANSITION_FIXTURE, questions[0], maliciousAnswer)).rejects.toThrow(
      /想定形式/,
    );
  });
});
