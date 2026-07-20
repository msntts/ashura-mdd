import { EmptyFileSystem, type LangiumDocument } from 'langium';
import { parseHelper } from 'langium/test';
import { describe, expect, test } from 'vitest';
import { createAshuraUiServices } from '../src/language/ashura-ui-module.js';
import type { Model } from '../src/language/generated/ast.js';

const WITH_VARIABLES = `
trait 基本ライフサイクル {
  状態: 通常 -> ホバー

  遷移 通常 -> ホバー [契機: "ポインタ進入"]
}

集約 ボタン uses 基本ライフサイクル {
  変数 {
    ラベル : "文字列"
  }
}
`;

const WITHOUT_VARIABLES = `
trait 基本ライフサイクル {
  状態: 通常 -> ホバー

  遷移 通常 -> ホバー [契機: "ポインタ進入"]
}

集約 装飾 uses 基本ライフサイクル {
}
`;

async function parse(source: string): Promise<LangiumDocument<Model>> {
  const services = createAshuraUiServices(EmptyFileSystem).AshuraUi;
  const parseFn = parseHelper<Model>(services);
  return parseFn(source, { validation: true });
}

describe('追加LSP検査: checkComponentHasVariables', () => {
  test('変数宣言のある集約には警告を出さない', async () => {
    const document = await parse(WITH_VARIABLES);
    const warnings = (document.diagnostics ?? []).filter((d) => d.message.includes('変数宣言がありません'));
    expect(warnings).toHaveLength(0);
  });

  test('変数宣言のない集約には警告を出す', async () => {
    const document = await parse(WITHOUT_VARIABLES);
    const warnings = (document.diagnostics ?? []).filter((d) => d.message.includes('変数宣言がありません'));
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.message).toContain('装飾');
  });
});
