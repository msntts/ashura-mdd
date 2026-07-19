import { AstUtils, type ValidationAcceptor, type ValidationChecks } from 'langium';
import {
  isGlossary,
  isModel,
  type AshuraAstType,
  type EventDecl,
  type Model,
  type VariableEntry,
} from './generated/ast.js';

export function registerValidationChecks(registry: {
  register(checks: ValidationChecks<AshuraAstType>, thisObj: unknown): void;
}): void {
  const validator = new AshuraValidator();
  const checks: ValidationChecks<AshuraAstType> = {
    EventDecl: validator.checkEventParamsInGlossary,
    VariableEntry: validator.checkVariableNameInGlossary,
  };
  registry.register(checks, validator);
}

function collectGlossaryTerms(model: Model): Set<string> {
  const terms = new Set<string>();
  for (const element of model.elements) {
    if (isGlossary(element)) {
      for (const term of element.terms) {
        terms.add(term.name);
      }
    }
  }
  return terms;
}

export class AshuraValidator {
  checkEventParamsInGlossary(node: EventDecl, accept: ValidationAcceptor): void {
    const model = AstUtils.getContainerOfType(node, isModel);
    if (!model) {
      return;
    }
    const glossaryTerms = collectGlossaryTerms(model);
    node.params.forEach((param, index) => {
      if (!glossaryTerms.has(param)) {
        accept('warning', `用語集に存在しない語です: ${param}`, { node, property: 'params', index });
      }
    });
  }

  checkVariableNameInGlossary(node: VariableEntry, accept: ValidationAcceptor): void {
    const model = AstUtils.getContainerOfType(node, isModel);
    if (!model) {
      return;
    }
    const glossaryTerms = collectGlossaryTerms(model);
    if (!glossaryTerms.has(node.name)) {
      accept('warning', `用語集に存在しない語です: ${node.name}`, { node, property: 'name' });
    }
  }
}
