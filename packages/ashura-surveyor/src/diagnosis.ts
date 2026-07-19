/**
 * 差分診断の決定表(domain/ashura.model.md 文脈「測量」決定表「差分診断」の実装)。
 *
 * 入力は3組の一致/乖離(①意図 vs ②実装、①意図 vs ③解釈、②実装 vs ③解釈)。
 * 一致は同値関係なので、①=②かつ①=③ならば②=③が成り立つ(推移律)。
 * よって論理的に可能な組合せは8通り中5通り(乖離0個・2個・3個)のみで、
 * ちょうど1個だけ乖離する3通りは本来ありえない。
 * しかし②③はLLM推論由来で推移性を保証しないため、実際には入力されうる。
 * この3通りは黙って通さず「入力不整合」として明示的に返す。
 */

export type Match = '一致' | '乖離';

export interface DiagnosisInput {
  readonly intentVsImplementation: Match;
  readonly intentVsDerivation: Match;
  readonly implementationVsDerivation: Match;
}

export type Diagnosis =
  '健全' | '実装の逸脱' | '仕様が曖昧(別解釈可能)' | 'モデルが現実と乖離' | '三者バラバラ' | '入力不整合';

export type Destination = '記録のみ' | '生成へ差し戻し(自動)' | '人間裁定' | '人間裁定(最優先)' | 'エラー(推移律違反)';

export interface DiagnosisResult {
  readonly diagnosis: Diagnosis;
  readonly destination: Destination;
}

export function diagnose(input: DiagnosisInput): DiagnosisResult {
  const { intentVsImplementation: x, intentVsDerivation: y, implementationVsDerivation: z } = input;
  const divergenceCount = [x, y, z].filter((match) => match === '乖離').length;

  if (divergenceCount === 0) {
    return { diagnosis: '健全', destination: '記録のみ' };
  }
  if (divergenceCount === 3) {
    return { diagnosis: '三者バラバラ', destination: '人間裁定(最優先)' };
  }
  if (divergenceCount === 1) {
    return { diagnosis: '入力不整合', destination: 'エラー(推移律違反)' };
  }

  // divergenceCount === 2: 一致している1組がどれかで診断が分かれる
  if (y === '一致') {
    // ①vs③のみ一致: 意図と解釈は一致、実装だけが逸脱
    return { diagnosis: '実装の逸脱', destination: '生成へ差し戻し(自動)' };
  }
  if (x === '一致') {
    // ①vs②のみ一致: 意図と実装は一致、解釈だけが割れる
    return { diagnosis: '仕様が曖昧(別解釈可能)', destination: '人間裁定' };
  }
  // z === '一致': ②vs③のみ一致: 実装と解釈は一致、意図だけが食い違う
  return { diagnosis: 'モデルが現実と乖離', destination: '人間裁定' };
}
