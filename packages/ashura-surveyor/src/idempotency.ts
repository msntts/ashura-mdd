import { runVerification, type CounterexampleSearch, type VerificationRunSummary } from './observation.js';
import type { VerificationTask } from './verification-task.js';

/**
 * 冪等性(domain/ashura.model.md 文脈「生成」不変条件「冪等性」)。
 * 「同一モデル+同一規約からの再生成は、検証結果が等価なコードを生む」。
 * バイト同一は要求しない(LLM非決定性の受容)。等価性は検証スイート(Phase 2 の
 * runVerification)の結果集合で定義する: コードバイトが異なっていても、
 * 全検証タスクの合格/反例が一致すれば等価とみなす。
 */
export interface IdempotencyCheckResult {
  readonly equivalent: boolean;
  readonly first: VerificationRunSummary;
  readonly second: VerificationRunSummary;
}

function outcomeSignature(summary: VerificationRunSummary): string {
  return summary.results
    .map((result) => `${result.task.kind}:${result.task.name}:${result.outcome}`)
    .sort()
    .join('|');
}

export function checkIdempotency(
  tasks: readonly VerificationTask[],
  firstGenerationSearch: CounterexampleSearch,
  secondGenerationSearch: CounterexampleSearch,
): IdempotencyCheckResult {
  const first = runVerification(tasks, firstGenerationSearch);
  const second = runVerification(tasks, secondGenerationSearch);

  return { equivalent: outcomeSignature(first) === outcomeSignature(second), first, second };
}
