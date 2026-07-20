import type { Model as CoreModel } from 'ashura-core';
import { desugarToCoreModel } from './desugar-to-core.js';
import type { Model as DialectModel } from './language/generated/ast.js';
import { parseDialectSource } from './parse-dialect.js';

/**
 * 方言プラグイン仕様(ADR-0002の三点セット)。
 * 1. parse/desugar: 構文糖衣→コア語彙への変換(このインターフェース)
 * 2. 追加LSP検査: ashura-ui-validator.ts で Langium の ValidationRegistry に
 *    登録済み(parse時に自動で走るため、このインターフェースには含めない)
 * 3. 検証アダプタ: VerificationAdapter(下記)
 */
export interface DialectPlugin {
  parse(source: string): Promise<DialectModel>;
  desugar(model: DialectModel): Promise<CoreModel>;
  readonly verificationAdapter: VerificationAdapter;
}

export type VerificationCheckKind = '視覚回帰' | 'a11y監査' | 'キーボード完遂性';

export interface VerificationCheck {
  readonly kind: VerificationCheckKind;
  readonly target: string;
}

export type VerificationOutcome = '合格' | '失敗';

export interface VerificationCheckResult {
  readonly check: VerificationCheck;
  readonly outcome: VerificationOutcome;
  readonly detail?: string;
}

/**
 * 視覚回帰・axe系a11y監査などの外部ツール実行は非決定的(実行環境依存)。この型の裏に
 * 隔離し、決定的コア(parse/desugar)からは具体的な実行方法を隠す(Phase 1 の
 * InferenceSource、Phase 2 の CounterexampleSearch と同型)。実ツール連携は Phase 4 の
 * スコープ外(フィクスチャで代替する)。
 */
export interface VerificationAdapter {
  verify(check: VerificationCheck): Promise<VerificationCheckResult>;
}

export function createAshuraUiPlugin(verificationAdapter: VerificationAdapter): DialectPlugin {
  return {
    parse: parseDialectSource,
    desugar: desugarToCoreModel,
    verificationAdapter,
  };
}
