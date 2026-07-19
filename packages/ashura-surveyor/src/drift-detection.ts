import { diagnose, type DiagnosisResult, type Destination, type Match } from './diagnosis.js';
import { declarationKey, type DeclarationId } from './trace-table.js';
import { detect, enterWaitingForVerdict, type Divergence } from './divergence-lifecycle.js';

/**
 * ①意図: 承認済みモデルの宣言についての記述。
 */
export interface IntentStatement {
  readonly declaration: DeclarationId;
  readonly statement: string;
}

/**
 * ②実装からの推論・③AI独立導出はどちらも非決定的(LLM由来)なプロセスであり、
 * 「宣言について何が言えるかの記述」を返す点で同じ形をしている。
 * この型の裏に非決定性を隔離し、決定的コア(diagnose・乖離ライフサイクル)からは
 * 具体的な生成方法(LLM呼び出し、あるいはPhase1のようにフィクスチャ)を隠す。
 */
export interface InferenceSource {
  infer(declaration: DeclarationId): string | undefined;
}

export interface DriftCheckResult {
  readonly declaration: DeclarationId;
  readonly diagnosisResult: DiagnosisResult;
  /** 宛先が人間裁定系のときのみ、裁定待ち状態の乖離として起票される */
  readonly divergence?: Divergence;
}

function compare(a: string | undefined, b: string | undefined): Match {
  return a === b ? '一致' : '乖離';
}

function requiresHumanArbitration(destination: Destination): boolean {
  return destination === '人間裁定' || destination === '人間裁定(最優先)';
}

export function checkDrift(
  intent: IntentStatement,
  implementationInference: InferenceSource,
  independentDerivation: InferenceSource,
  now: number,
): DriftCheckResult {
  const implementationStatement = implementationInference.infer(intent.declaration);
  const derivationStatement = independentDerivation.infer(intent.declaration);

  const diagnosisResult = diagnose({
    intentVsImplementation: compare(intent.statement, implementationStatement),
    intentVsDerivation: compare(intent.statement, derivationStatement),
    implementationVsDerivation: compare(implementationStatement, derivationStatement),
  });

  const divergence = requiresHumanArbitration(diagnosisResult.destination)
    ? enterWaitingForVerdict(detect(declarationKey(intent.declaration), now), now)
    : undefined;

  return { declaration: intent.declaration, diagnosisResult, divergence };
}
