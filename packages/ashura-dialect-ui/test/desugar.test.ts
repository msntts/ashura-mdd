import { describe, expect, test } from 'vitest';
import { desugarToCoreModel, parseCoreSource } from '../src/desugar-to-core.js';
import { parseDialectSource } from '../src/parse-dialect.js';

const TRAIT_AND_COMPONENT = `
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

describe('desugarToCoreModel', () => {
  test('trait の状態・遷移・禁止が uses する集約に展開され、コアが診断なしでパースできる', async () => {
    const dialectModel = await parseDialectSource(TRAIT_AND_COMPONENT);
    const coreModel = await desugarToCoreModel(dialectModel);

    // 集約定義に加え、契機トリガーに対応するコマンド/イベント宣言を持つフローも
    // 生成される(コアの checkTriggerReferencesExistingEvent を満たす完全な脱糖)
    expect(coreModel.elements).toHaveLength(2);
    const aggregate = coreModel.elements.find((element) => element.$type === 'Aggregate');
    expect(aggregate?.$type).toBe('Aggregate');
    if (aggregate?.$type !== 'Aggregate') {
      throw new Error('unreachable');
    }
    expect(aggregate.name).toBe('ボタン');
    expect(aggregate.states.map((state) => state.name)).toEqual(['通常', 'ホバー', '押下']);

    const transitions = aggregate.members.filter((member) => member.$type === 'Transition');
    expect(transitions).toHaveLength(2);
    const forbidden = aggregate.members.filter((member) => member.$type === 'Forbidden');
    expect(forbidden).toHaveLength(1);

    const flow = coreModel.elements.find((element) => element.$type === 'Flow');
    expect(flow?.$type).toBe('Flow');
  });

  test('回帰: 存在しないイベントへの契機参照を含む不正なコアテキストはエラーとして検出される(diagnosticsの握りつぶし防止)', async () => {
    const invalidCoreSource = `
集約 サンプル {
  状態: A -> B

  遷移 A -> B [契機: "未定義イベント"]
}
`;
    await expect(parseCoreSource(invalidCoreSource)).rejects.toThrow();
  });
});
