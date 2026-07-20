import { isAggregate, isForbidden, type Model } from 'ashura-core';

/**
 * ファシリテーション(domain/ashura.model.md フロー「ファシリテーション」の
 * ポリシー「対話中のとき→失敗系・禁止遷移・境界規則を能動的に質問する」の決定的な下地)。
 *
 * 草稿モデルの構造的な欠落を機械的に検出し、質問アジェンダを生成する。
 * 対話そのもの(非決定的、LLM由来)はPhase 3のスコープ外。「失敗系・境界規則」の
 * 検出は自由文字列の解析が必要で誤検知リスクが高いため、Phase 3では構造的に
 * 判定できる「禁止遷移」の欠落のみを対象とする(決定的な表面を偽らない)。
 */
export interface FacilitationQuestion {
  readonly scope: string;
  readonly topic: '禁止遷移';
  readonly question: string;
}

export function analyzeGaps(model: Model): readonly FacilitationQuestion[] {
  const questions: FacilitationQuestion[] = [];

  for (const element of model.elements) {
    if (isAggregate(element)) {
      const hasForbiddenTransition = element.members.some((member) => isForbidden(member));
      if (!hasForbiddenTransition) {
        questions.push({
          scope: element.name,
          topic: '禁止遷移',
          question: `集約「${element.name}」に禁止遷移の宣言がありません。許可してはいけない状態遷移はありますか?`,
        });
      }
    }
  }

  return questions;
}
