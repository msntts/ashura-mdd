import type { Model } from 'ashura-core';
import { describe, expect, test } from 'vitest';
import { analyzeGaps } from '../src/facilitator.js';
import { generate, type CodeEmitter } from '../src/generation.js';
import { enumerateModelDeclarations } from '../src/model-declarations.js';
import type { ModelStatus } from '../src/model-status.js';
import type { DeclarationId, TraceTable } from '../src/trace-table.js';
import { parseSelfModel } from './support/parse-self-model.js';

/**
 * Phase 5 ROADMAP項目2「Ashuraの開発プロセス自体がAshuraのライフサイクル
 * (草稿→検査通過→レビュー中→承認済み)を通る」の実証。
 *
 * 性質「自己適用性」(domain/ashura.model.ashura)が主張する内容そのもの:
 * この環境自身のモデルも、他のモデル(sugoroku等)と同じサーベイヤー関数
 * (enumerateModelDeclarations・analyzeGaps・generate)にコード変更なしで
 * かけられることを検証する。承認そのもの(人間ゲート)は自動化しない —
 * ここで検証するのは承認済みになった "後" にゲート・トレース表完全性・
 * 欠落分析が正しく機能する、という周辺の決定的機構のみ。
 */

function completeEmitter(model: Model): CodeEmitter {
  return {
    emit: () => {
      const declarations = enumerateModelDeclarations(model);
      const traceTable: TraceTable = {
        modelSource: 'ashura.model.ashura',
        entries: declarations.map((declaration, index) => ({
          declaration,
          codeLocations: [{ file: 'src/generated/self-model.ts', line: index + 1 }],
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
        modelSource: 'ashura.model.ashura',
        entries: declarations.map((declaration, index) => ({
          declaration,
          codeLocations: [{ file: 'src/generated/self-model.ts', line: index + 1 }],
        })),
      };
      return { code: '// generated code (fixture, incomplete)', traceTable };
    },
  };
}

describe('自己モデル(domain/ashura.model.ashura)が既存サーベイヤー関数にコード変更なしでかかる', () => {
  test('enumerateModelDeclarationsが自己モデルの遷移・不変条件・性質・依存を過不足なく列挙する', async () => {
    const model = await parseSelfModel();
    const declarations = enumerateModelDeclarations(model);

    const byKind = (kind: DeclarationId['kind']) => declarations.filter((d) => d.kind === kind);

    expect(byKind('遷移')).toHaveLength(7); // モデル成果物5 + 乖離2
    expect(byKind('不変条件')).toHaveLength(3); // モデル成果物2 + 乖離1
    expect(byKind('性質')).toHaveLength(6); // 冪等性1 + 独立導出1 + 横断的性質4
    expect(byKind('依存')).toHaveLength(4); // LSP・LLM推論・CI基盤・人間レビュアー

    expect(byKind('遷移').map((d) => d.name)).toContain('検出->裁定待ち');
    expect(byKind('性質').map((d) => d.name)).toContain('自己適用性');
    expect(byKind('依存').map((d) => d.name)).toContain('人間レビュアー');
  });

  test('analyzeGapsは自己モデルの2集約(モデル成果物・乖離)いずれにも質問を出さない(両方に禁止遷移が宣言済み)', async () => {
    const model = await parseSelfModel();
    expect(analyzeGaps(model)).toHaveLength(0);
  });

  test.each<ModelStatus>(['草稿', '検査通過', 'レビュー中'])(
    '自己モデルもステータスが%sなら生成失敗(モデル未承認)を返す(ゲート不可迂回性は自己モデルにも適用される)',
    async (status) => {
      const model = await parseSelfModel();
      const result = generate(model, status, completeEmitter(model));
      expect(result).toMatchObject({ kind: '生成失敗', reason: 'モデル未承認' });
    },
  );

  test('自己モデルが承認済み+完全なトレース表を持てば生成完了を返す(ブートストラップ: 環境自身のモデルも自分のライフサイクルを最後まで通れる)', async () => {
    const model = await parseSelfModel();
    const result = generate(model, '承認済み', completeEmitter(model));
    expect(result.kind).toBe('生成完了');
  });

  test('自己モデルが承認済みでもトレース表に宣言の欠落があれば生成失敗(トレース表不完全)を返す', async () => {
    const model = await parseSelfModel();
    const emitter = emitterOmitting(model, (declaration) => declaration.name === '自己適用性');
    const result = generate(model, '承認済み', emitter);

    expect(result).toMatchObject({ kind: '生成失敗', reason: 'トレース表不完全' });
    if (result.kind === '生成失敗') {
      expect(result.detail).toContain('自己適用性');
    }
  });
});
