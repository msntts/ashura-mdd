import { EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import { describe, expect, test } from 'vitest';
import { createAshuraServices } from '../src/language/ashura-module.js';
import type { Model } from '../src/language/generated/ast.js';

const MIN_FIXTURE = `
用語集 テスト用語 {
  対象     : 実体   "説明文"
}

集約 サンプル集約 {
  状態: 開始 -> 完了

  遷移 開始 -> 完了 [契機: "完了イベント"]
  禁止 完了 -> 開始

  変数 {
    対象位置 : "数値"
  }

  不変条件 {
    "対象位置は常に0以上である"
  }
}

フロー サンプルフロー {
  コマンド 開始する
    -> イベント 完了イベント(対象位置)

  ポリシー: 完了イベント のとき
    -> コマンド 後処理する

  連鎖上限: 3
  検査: "ループがないこと"
}

決定表 サンプル決定表 {
  入力: "対象位置"
  出力: "アクション"

  行 "0" -> "何もしない"
  行 "その他" -> "処理する" "備考"

  検査: "出力が範囲内であること"
}

性質 {
  停止性: "有限手数で完了に到達する"
}

文脈間 {
  依存 外部サービス ("任意, 失敗時: 無視")
}
`;

describe('grammar: minimal fixture covering all sections', () => {
  test('parses without diagnostics', async () => {
    const services = createAshuraServices(EmptyFileSystem).Ashura;
    const parse = parseHelper<Model>(services);
    const document = await parse(MIN_FIXTURE);
    expect(document.parseResult.lexerErrors).toHaveLength(0);
    expect(document.parseResult.parserErrors).toHaveLength(0);
    expect(document.diagnostics ?? []).toHaveLength(0);
    expect(document.parseResult.value.elements).toHaveLength(6);
  });
});
