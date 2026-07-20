import { describe, expect, test } from 'vitest';
import { enumerateModelDeclarations } from '../src/model-declarations.js';
import { declarationKey } from '../src/trace-table.js';
import { MULTI_INVARIANT_BLOCK_FIXTURE } from './support/fixtures.js';
import { parseFixture } from './support/parse-fixture.js';
import { parseSugoroku } from './support/parse-sugoroku.js';

describe('enumerateModelDeclarations (sugoroku.ashuraの実ASTから)', () => {
  test('遷移2件・不変条件3件・性質4件・失敗セマンティクス2件が過不足なく列挙される(禁止遷移は対象外)', async () => {
    const model = await parseSugoroku();
    const declarations = enumerateModelDeclarations(model);

    const byKind = (kind: string) => declarations.filter((declaration) => declaration.kind === kind);
    expect(byKind('遷移')).toHaveLength(2);
    expect(byKind('不変条件')).toHaveLength(3);
    expect(byKind('性質')).toHaveLength(4);
    expect(byKind('依存')).toHaveLength(2);
    expect(declarations).toHaveLength(11);
  });

  test('遷移の宣言名は from->to 形式', async () => {
    const model = await parseSugoroku();
    const declarations = enumerateModelDeclarations(model);
    const transitionNames = declarations.filter((declaration) => declaration.kind === '遷移').map((d) => d.name);
    expect(transitionNames.sort()).toEqual(['募集中->進行中', '進行中->終了'].sort());
  });

  test('全宣言のキーが一意である', async () => {
    const model = await parseSugoroku();
    const declarations = enumerateModelDeclarations(model);
    const keys = declarations.map(declarationKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test('同一集約に不変条件ブロックが複数あってもインデックスは集約全体で通し番号になり衝突しない(回帰: code-reviewで検出)', async () => {
    const model = await parseFixture(MULTI_INVARIANT_BLOCK_FIXTURE);
    const declarations = enumerateModelDeclarations(model);

    const invariants = declarations.filter((declaration) => declaration.kind === '不変条件');
    expect(invariants).toHaveLength(2);
    expect(invariants.map((declaration) => declaration.name)).toEqual(['0', '1']);

    const keys = declarations.map(declarationKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
