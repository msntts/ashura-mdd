import { analyzeGaps, enumerateModelDeclarations } from 'ashura-surveyor';
import { describe, expect, test } from 'vitest';
import { desugarToCoreModel } from '../src/desugar-to-core.js';
import { parseDialectSource } from '../src/parse-dialect.js';

/**
 * ADR-0002 の核心「サーベイヤーは脱糖後のコア語彙のみを見る(測量器は一つ)」の実証。
 * ここでは Phase 1-3 で実装済みの ashura-surveyor 関数を一切変更せず、脱糖後の
 * コア ast.Model にそのまま適用する。脱糖の単体テストだけで終えると Phase 1 の
 * 乖離ライフサイクル配線漏れと同じ「テストは緑だが半分のパイプライン」になるため、
 * この一気通貫テストを受け入れ条件の中核に置く(PLAN.md参照)。
 */

const WITH_FORBIDDEN = `
trait 基本ライフサイクル {
  状態: 通常 -> ホバー -> 押下

  遷移 通常 -> ホバー [契機: "ポインタ進入"]
  遷移 ホバー -> 押下 [契機: "ポインタ押下"]
  禁止 押下 -> 通常
}

集約 ボタン uses 基本ライフサイクル {
  変数 {
    ラベル : "文字列"
  }
}
`;

const WITHOUT_FORBIDDEN = `
trait 未整備ライフサイクル {
  状態: 開 -> 閉

  遷移 開 -> 閉 [契機: "閉じる"]
}

集約 モーダル uses 未整備ライフサイクル {
  変数 {
    タイトル : "文字列"
  }
}
`;

describe('既存サーベイヤーが脱糖後のコアModelにコード変更なしで動作する', () => {
  test('trait由来の遷移がenumerateModelDeclarationsで正しく列挙される', async () => {
    const dialectModel = await parseDialectSource(WITH_FORBIDDEN);
    const coreModel = await desugarToCoreModel(dialectModel);

    const declarations = enumerateModelDeclarations(coreModel);
    const transitions = declarations.filter((declaration) => declaration.kind === '遷移');

    expect(transitions).toHaveLength(2);
    expect(transitions.map((declaration) => declaration.name).sort()).toEqual(['通常->ホバー', 'ホバー->押下'].sort());
  });

  test('trait側で禁止遷移を定義していればanalyzeGapsは質問を出さない', async () => {
    const dialectModel = await parseDialectSource(WITH_FORBIDDEN);
    const coreModel = await desugarToCoreModel(dialectModel);

    expect(analyzeGaps(coreModel)).toHaveLength(0);
  });

  test('trait側に禁止遷移がなければanalyzeGapsが質問を出す(脱糖後もコアの欠落分析がそのまま効く)', async () => {
    const dialectModel = await parseDialectSource(WITHOUT_FORBIDDEN);
    const coreModel = await desugarToCoreModel(dialectModel);

    const questions = analyzeGaps(coreModel);
    expect(questions).toEqual([
      { scope: 'モーダル', topic: '禁止遷移', question: expect.stringContaining('モーダル') },
    ]);
  });
});
