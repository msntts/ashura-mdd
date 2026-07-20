import { describe, expect, test } from 'vitest';
import { createAshuraUiPlugin, type VerificationAdapter, type VerificationCheckResult } from '../src/dialect-plugin.js';

const SOURCE = `
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

function fixtureAdapter(result: VerificationCheckResult): VerificationAdapter {
  return { verify: async () => result };
}

describe('createAshuraUiPlugin', () => {
  test('parse -> desugar が一気通貫でコアModelを返す', async () => {
    const plugin = createAshuraUiPlugin(
      fixtureAdapter({ check: { kind: '視覚回帰', target: 'ボタン' }, outcome: '合格' }),
    );

    const dialectModel = await plugin.parse(SOURCE);
    const coreModel = await plugin.desugar(dialectModel);

    expect(coreModel.elements).toHaveLength(2);
    expect(coreModel.elements.some((element) => element.$type === 'Aggregate')).toBe(true);
  });

  test('verificationAdapterは非決定的要素(外部ツール実行)をフィクスチャで代替できる', async () => {
    const plugin = createAshuraUiPlugin(
      fixtureAdapter({ check: { kind: 'a11y監査', target: 'ボタン' }, outcome: '失敗', detail: 'コントラスト比不足' }),
    );

    const result = await plugin.verificationAdapter.verify({ kind: 'a11y監査', target: 'ボタン' });

    expect(result.outcome).toBe('失敗');
    expect(result.detail).toContain('コントラスト');
  });
});
