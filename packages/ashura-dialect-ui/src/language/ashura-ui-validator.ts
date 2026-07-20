import type { ValidationAcceptor, ValidationChecks } from 'langium';
import type { AshuraUiAstType, Component } from './generated/ast.js';

/**
 * 追加LSP検査(方言プラグイン三点セットの2つ目)。代表として1つのみ実装する
 * (PLAN.md: 三点セットを丸ごと実装しない。アーキテクチャの実証を優先)。
 *
 * 方言固有の構文糖衣に対する検査であり、脱糖後のコア語彙に対する検査
 * (語彙整合・網羅性・参照整合)はコア側(ashura-core)の責務のまま。
 */
export function registerValidationChecks(registry: {
  register(checks: ValidationChecks<AshuraUiAstType>, thisObj: unknown): void;
}): void {
  const validator = new AshuraUiValidator();
  const checks: ValidationChecks<AshuraUiAstType> = {
    Component: validator.checkComponentHasVariables,
  };
  registry.register(checks, validator);
}

export class AshuraUiValidator {
  checkComponentHasVariables(node: Component, accept: ValidationAcceptor): void {
    if (!node.variables || node.variables.entries.length === 0) {
      accept(
        'warning',
        `集約「${node.name}」に変数宣言がありません。props/状態を持たない部品は意図的か確認してください`,
        {
          node,
          property: 'name',
        },
      );
    }
  }
}
