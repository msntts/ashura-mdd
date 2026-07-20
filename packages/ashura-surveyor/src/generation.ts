import type { Model } from 'ashura-core';
import { enumerateModelDeclarations } from './model-declarations.js';
import type { ModelStatus } from './model-status.js';
import { declarationKey, findUntracedDeclarations, type DeclarationId, type TraceTable } from './trace-table.js';

/**
 * コード実体の生成は非決定的(LLM由来)。この型の裏に隔離し、決定的コア(生成ゲート・
 * トレース表完全性検査)からは具体的な生成方法(実LLM、あるいはPhase3のようにフィクスチャ)を隠す。
 */
export interface CodeEmitter {
  emit(model: Model): { readonly code: string; readonly traceTable: TraceTable };
}

export type GenerationFailureReason = 'モデル未承認' | 'トレース表不完全';

export interface GenerationSuccess {
  readonly kind: '生成完了';
  readonly code: string;
  readonly traceTable: TraceTable;
}

export interface GenerationFailure {
  readonly kind: '生成失敗';
  readonly reason: GenerationFailureReason;
  readonly detail: string;
}

export type GenerationResult = GenerationSuccess | GenerationFailure;

/**
 * emitter が返す TraceTable は「言及した宣言」のみを含みうるため、宣言そのものが
 * entry ごと欠けているケースを findUntracedDeclarations だけでは検出できない。
 * モデルから独立に列挙した期待宣言一覧と突き合わせ、欠落を空 codeLocations として補完する。
 */
function reconcileTraceTable(expected: readonly DeclarationId[], emitted: TraceTable): TraceTable {
  const emittedByKey = new Map(emitted.entries.map((entry) => [declarationKey(entry.declaration), entry]));
  const entries = expected.map(
    (declaration) => emittedByKey.get(declarationKey(declaration)) ?? { declaration, codeLocations: [] },
  );
  return { modelSource: emitted.modelSource, entries };
}

/**
 * domain/ashura.model.md 文脈「生成」フロー「コード生成」の実装。
 * 前提「モデル成果物.状態 == 承認済み」を満たさない場合、および
 * トレース表の完全性(全宣言がコード上の対応位置を少なくとも1つ持つ)を
 * 満たさない場合は、黙って落とさず 生成失敗 として返す。
 */
export function generate(model: Model, status: ModelStatus, emitter: CodeEmitter): GenerationResult {
  if (status !== '承認済み') {
    return {
      kind: '生成失敗',
      reason: 'モデル未承認',
      detail: `モデル成果物の状態が承認済みではありません(現在: ${status})。未承認モデルからは生成しない`,
    };
  }

  const expectedDeclarations = enumerateModelDeclarations(model);
  const emitted = emitter.emit(model);
  const traceTable = reconcileTraceTable(expectedDeclarations, emitted.traceTable);
  const untraced = findUntracedDeclarations(traceTable);

  if (untraced.length > 0) {
    return {
      kind: '生成失敗',
      reason: 'トレース表不完全',
      detail: `対応位置を持たない宣言があります: ${untraced.map(declarationKey).join(', ')}`,
    };
  }

  return { kind: '生成完了', code: emitted.code, traceTable };
}
