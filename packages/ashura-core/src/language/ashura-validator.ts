import { AstUtils, type ValidationAcceptor, type ValidationChecks } from 'langium';
import {
  isFlow,
  isGlossary,
  isModel,
  isTransition,
  type Aggregate,
  type AshuraAstType,
  type EventDecl,
  type Model,
  type Transition,
  type VariableEntry,
} from './generated/ast.js';

export function registerValidationChecks(registry: {
  register(checks: ValidationChecks<AshuraAstType>, thisObj: unknown): void;
}): void {
  const validator = new AshuraValidator();
  const checks: ValidationChecks<AshuraAstType> = {
    EventDecl: validator.checkEventParamsInGlossary,
    VariableEntry: validator.checkVariableNameInGlossary,
    Aggregate: validator.checkStateMachineCoverage,
    Transition: validator.checkTriggerReferencesExistingEvent,
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

function collectEventNames(model: Model): Set<string> {
  const names = new Set<string>();
  for (const element of model.elements) {
    if (isFlow(element)) {
      for (const statement of element.statements) {
        if (statement.$type === 'CommandDecl' && statement.event) {
          names.add(statement.event.name);
        }
        if (statement.$type === 'PolicyDecl') {
          for (const step of statement.steps) {
            if (step.event) {
              names.add(step.event.name);
            }
          }
        }
      }
    }
  }
  return names;
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

  // Phase 0の暫定実装: 状態宣言チェーンは分岐・合流のない直線的な列であることを前提にしている。
  // 分岐する状態機械を扱う場合はこの前提から見直しが必要。
  checkStateMachineCoverage(node: Aggregate, accept: ValidationAcceptor): void {
    if (node.states.length === 0) {
      return;
    }

    const transitions = node.members
      .filter(isTransition)
      .map((t) => ({ from: t.from.ref?.name, to: t.to.ref?.name }))
      .filter((t): t is { from: string; to: string } => t.from !== undefined && t.to !== undefined);

    // 未定義遷移: 状態宣言チェーンが暗示する隣接ペアに対応する明示的な遷移が要る
    for (let i = 0; i < node.states.length - 1; i++) {
      const from = node.states[i].name;
      const to = node.states[i + 1].name;
      const hasExplicitTransition = transitions.some((t) => t.from === from && t.to === to);
      if (!hasExplicitTransition) {
        accept('error', `状態宣言チェーンに対応する遷移が定義されていません: ${from} -> ${to}`, {
          node,
          property: 'states',
          index: i + 1,
        });
      }
    }

    // 到達不能状態: 状態宣言チェーンの先頭を初期状態とし、明示的な遷移だけを辺として到達可能性を判定する
    const adjacency = new Map<string, string[]>();
    for (const t of transitions) {
      const targets = adjacency.get(t.from) ?? [];
      targets.push(t.to);
      adjacency.set(t.from, targets);
    }

    const initial = node.states[0].name;
    const reached = new Set<string>([initial]);
    const queue = [initial];
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const next of adjacency.get(current) ?? []) {
        if (!reached.has(next)) {
          reached.add(next);
          queue.push(next);
        }
      }
    }

    node.states.forEach((state, index) => {
      if (!reached.has(state.name)) {
        accept('warning', `到達不能な状態です: ${state.name}`, { node, property: 'states', index });
      }
    });
  }

  checkTriggerReferencesExistingEvent(node: Transition, accept: ValidationAcceptor): void {
    if (node.guard.kind !== '契機') {
      return;
    }
    const model = AstUtils.getContainerOfType(node, isModel);
    if (!model) {
      return;
    }
    const eventNames = collectEventNames(model);
    // 契機テキストは空白区切りの先頭トークンがイベント名である前提の簡易パース。
    // GuardSpecは自由文字列(STRING)なのでDSL文法が変わるとここもサイレントに壊れうる。
    const triggerName = node.guard.text.trim().split(/\s+/)[0];
    if (triggerName && !eventNames.has(triggerName)) {
      accept('error', `存在しないイベントへの契機参照です: ${triggerName}`, { node, property: 'guard' });
    }
  }
}
