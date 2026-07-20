import { EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import { describe, expect, test } from 'vitest';
import { createAshuraUiServices } from '../src/language/ashura-ui-module.js';
import type { Model } from '../src/language/generated/ast.js';

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

describe('ashura-dialect-ui grammar', () => {
  test('trait と component が診断なしでパースされる', async () => {
    const services = createAshuraUiServices(EmptyFileSystem).AshuraUi;
    const parse = parseHelper<Model>(services);
    const document = await parse(TRAIT_AND_COMPONENT, { validation: true });

    expect(document.parseResult.lexerErrors).toHaveLength(0);
    expect(document.parseResult.parserErrors).toHaveLength(0);
    expect(document.parseResult.value.elements).toHaveLength(2);
  });
});
