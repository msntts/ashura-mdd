import type { VerificationTask } from './verification-task.js';

/**
 * 観測結果の集約(domain/ashura.model.md フロー「攻撃」の
 * イベント「観測結果確定(合格/反例)」に対応)。
 */
export type ObservationOutcome = '合格' | '反例';

export interface ObservationResult {
  readonly task: VerificationTask;
  readonly outcome: ObservationOutcome;
  readonly counterexample?: string;
}

/**
 * 性質宣言に対する反例探索(プロパティベース/ファジング/フォールト注入)・
 * 失敗セマンティクス宣言に対する依存除去照合は、どちらも非決定的
 * (実LLM推論+実行環境依存)。この型の裏に隔離し、決定的コア(集約)からは
 * 具体的な実行方法(実LLM+SUT、あるいはPhase2のようなフィクスチャ)を隠す。
 */
export interface CounterexampleSearch {
  search(task: VerificationTask): ObservationResult;
}

export interface VerificationRunSummary {
  readonly results: readonly ObservationResult[];
  readonly allPassed: boolean;
}

export function runVerification(
  tasks: readonly VerificationTask[],
  search: CounterexampleSearch,
): VerificationRunSummary {
  const results = tasks.map((task) => search.search(task));
  return { results, allPassed: results.every((result) => result.outcome === '合格') };
}
