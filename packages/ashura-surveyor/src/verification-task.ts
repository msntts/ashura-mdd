import { isDependencyBlock, isPropertyBlock, type Model } from 'ashura-core';

/**
 * 検証タスク(domain/ashura.model.ashura 文脈「検証」フロー「攻撃」の
 * 「性質宣言ごとに」「失敗セマンティクス宣言ごとに」に対応)。
 */
export type VerificationTaskKind = '性質' | '失敗セマンティクス';

export interface VerificationTask {
  readonly kind: VerificationTaskKind;
  readonly name: string;
  readonly declaration: string;
}

/**
 * 検証タスクを承認済みモデルの AST(`ast.Model`)のみから列挙する。
 * 入力型が ast.Model のみであること自体が「独立導出」(検証ケースはモデルの宣言のみから
 * 導出し、生成されたコードを見て作らない。共謀防止)の型的保証になる —
 * この関数は生成されたコードへ到達する経路を一切持たない。
 */
export function enumerateVerificationTasks(model: Model): readonly VerificationTask[] {
  const tasks: VerificationTask[] = [];

  for (const element of model.elements) {
    if (isPropertyBlock(element)) {
      for (const property of element.properties) {
        tasks.push({ kind: '性質', name: property.name, declaration: property.body });
      }
    } else if (isDependencyBlock(element)) {
      for (const dependency of element.entries) {
        tasks.push({ kind: '失敗セマンティクス', name: dependency.name, declaration: dependency.spec });
      }
    }
  }

  return tasks;
}
