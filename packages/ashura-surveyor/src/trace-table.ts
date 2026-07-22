/**
 * トレース表: モデル宣言 → コード位置の対応(domain/ashura.model.ashura「生成」文脈の不変条件
 * 「トレース表の完全性」に対応する型)。
 */

export type DeclarationKind = '遷移' | '不変条件' | '性質' | '依存' | '決定表' | 'ポリシー';

export interface DeclarationId {
  /** 宣言が属する集約/フロー/文脈などの名前 */
  readonly scope: string;
  readonly kind: DeclarationKind;
  /** 同一scope・kind内で宣言を一意に指す名前(遷移なら "募集中->進行中" など) */
  readonly name: string;
}

export interface CodeLocation {
  readonly file: string;
  readonly line?: number;
  readonly symbol?: string;
}

export interface TraceEntry {
  readonly declaration: DeclarationId;
  readonly codeLocations: readonly CodeLocation[];
}

export interface TraceTable {
  readonly modelSource: string;
  readonly entries: readonly TraceEntry[];
}

export function declarationKey(declaration: DeclarationId): string {
  return `${declaration.scope}.${declaration.kind}.${declaration.name}`;
}

/**
 * トレース表の完全性を検査する。対応位置を1つも持たない宣言があれば、
 * その declarationId 一覧を返す(0件なら完全)。
 * 「対応が付けられない宣言があれば生成失敗として返す。黙って落とさない」に対応。
 */
export function findUntracedDeclarations(table: TraceTable): readonly DeclarationId[] {
  return table.entries.filter((entry) => entry.codeLocations.length === 0).map((entry) => entry.declaration);
}
