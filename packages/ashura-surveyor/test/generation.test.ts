import type { Model } from 'ashura-core';
import { describe, expect, test } from 'vitest';
import { generate, type CodeEmitter } from '../src/generation.js';
import { enumerateModelDeclarations } from '../src/model-declarations.js';
import type { ModelStatus } from '../src/model-status.js';
import type { DeclarationId, TraceTable } from '../src/trace-table.js';
import { MULTI_INVARIANT_BLOCK_FIXTURE } from './support/fixtures.js';
import { parseFixture } from './support/parse-fixture.js';
import { parseSugoroku } from './support/parse-sugoroku.js';

function completeEmitter(model: Model): CodeEmitter {
  return {
    emit: () => {
      const declarations = enumerateModelDeclarations(model);
      const traceTable: TraceTable = {
        modelSource: 'sugoroku.ashura',
        entries: declarations.map((declaration, index) => ({
          declaration,
          codeLocations: [{ file: 'src/generated/sugoroku.ts', line: index + 1 }],
        })),
      };
      return { code: '// generated code (fixture)', traceTable };
    },
  };
}

function emitterOmitting(model: Model, shouldOmit: (declaration: DeclarationId) => boolean): CodeEmitter {
  return {
    emit: () => {
      const declarations = enumerateModelDeclarations(model).filter((declaration) => !shouldOmit(declaration));
      const traceTable: TraceTable = {
        modelSource: 'fixture',
        entries: declarations.map((declaration, index) => ({
          declaration,
          codeLocations: [{ file: 'src/generated/fixture.ts', line: index + 1 }],
        })),
      };
      return { code: '// generated code (fixture, incomplete)', traceTable };
    },
  };
}

describe('generate (sugoroku.ashuraの実ASTから)', () => {
  test.each<ModelStatus>(['草稿', '検査通過', 'レビュー中'])(
    'ステータスが%sなら生成失敗(モデル未承認)を返す(ゲート不可迂回性)',
    async (status) => {
      const model = await parseSugoroku();
      const result = generate(model, status, completeEmitter(model));
      expect(result).toMatchObject({ kind: '生成失敗', reason: 'モデル未承認' });
    },
  );

  test('承認済み+完全なトレース表なら生成完了を返す', async () => {
    const model = await parseSugoroku();
    const result = generate(model, '承認済み', completeEmitter(model));
    expect(result.kind).toBe('生成完了');
  });

  test('承認済みでもトレース表に宣言の欠落(entryごと無い)があれば生成失敗(トレース表不完全)を返す(黙って落とさない)', async () => {
    const model = await parseSugoroku();
    const emitter = emitterOmitting(model, (declaration) => declaration.name === '履歴再現性');
    const result = generate(model, '承認済み', emitter);

    expect(result).toMatchObject({ kind: '生成失敗', reason: 'トレース表不完全' });
    if (result.kind === '生成失敗') {
      expect(result.detail).toContain('履歴再現性');
    }
  });

  test('同一集約に不変条件ブロックが複数あるモデルで2番目の不変条件だけ省略したemitterは生成失敗になる(回帰: code-reviewで検出した宣言キー衝突の穴)', async () => {
    const model = await parseFixture(MULTI_INVARIANT_BLOCK_FIXTURE);
    const emitter = emitterOmitting(
      model,
      (declaration) => declaration.kind === '不変条件' && declaration.name === '1',
    );
    const result = generate(model, '承認済み', emitter);

    expect(result.kind).toBe('生成失敗');
  });
});
