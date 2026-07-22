import {
  isAggregate,
  isDependencyBlock,
  isInvariantBlock,
  isPropertyBlock,
  isTransition,
  type Model,
} from 'ashura-core';
import type { DeclarationId } from './trace-table.js';

/**
 * モデルの全宣言(遷移・不変条件・性質・失敗セマンティクス)を、承認済みモデルの
 * AST(`ast.Model`)のみから列挙する(domain/ashura.model.ashura 文脈「生成」の不変条件
 * 「トレース表の完全性」が対象とする宣言の集合)。
 *
 * 入力型が ast.Model のみであることは Phase 2 の `enumerateVerificationTasks` と同じ
 * 独立性の担保になる: 生成されたコードを見ずにモデル宣言だけから宣言一覧を確定できる。
 */
export function enumerateModelDeclarations(model: Model): readonly DeclarationId[] {
  const declarations: DeclarationId[] = [];

  for (const element of model.elements) {
    if (isAggregate(element)) {
      // 集約内に不変条件ブロックが複数存在しうる(members は配列)ため、
      // インデックスはブロック単位ではなく集約全体で通し番号にする
      // (ブロック単位だと異なるブロックの1件目同士が同じ名前 '0' になり宣言キーが衝突する)
      let invariantIndex = 0;
      for (const member of element.members) {
        if (isTransition(member)) {
          declarations.push({
            scope: element.name,
            kind: '遷移',
            name: `${member.from.$refText}->${member.to.$refText}`,
          });
        } else if (isInvariantBlock(member)) {
          for (let i = 0; i < member.entries.length; i += 1) {
            declarations.push({ scope: element.name, kind: '不変条件', name: String(invariantIndex) });
            invariantIndex += 1;
          }
        }
      }
    } else if (isPropertyBlock(element)) {
      for (const property of element.properties) {
        declarations.push({ scope: 'モデル', kind: '性質', name: property.name });
      }
    } else if (isDependencyBlock(element)) {
      for (const dependency of element.entries) {
        declarations.push({ scope: 'モデル', kind: '依存', name: dependency.name });
      }
    }
  }

  return declarations;
}
