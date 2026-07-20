import { isComponent, type Component, type Model, type Trait } from './language/generated/ast.js';

/**
 * trait(基底状態機械の取り込み)の脱糖(ADR-0002)。
 * 方言AST(trait + それを uses する集約)から、コア(ashura-core)がそのまま
 * パースできる `.ashura` テキストを生成する。コアASTノードを直接組み立てる
 * (「$container」や参照解決を手で再現する)方式は壊れやすいため採用しない —
 * テキストを生成し、ashura-core 自身の再パースに委ねる。
 */

// コアの STRING 終端(ashura.langium: /"[^"]*"|'[^']*'/)はエスケープ規則を持たない。
// ダブルクオートを含む値はコアの構文で表現できないため、脱糖時点で明示的に拒否する
// (黙って壊れたテキストを生成しない)。
function toQuotedString(value: string): string {
  if (value.includes('"')) {
    throw new Error(`コアの STRING 終端はダブルクオートをエスケープできません: "${value}"`);
  }
  return `"${value}"`;
}

function resolveTrait(component: Component): Trait {
  const trait = component.trait.ref;
  if (!trait) {
    throw new Error(`集約「${component.name}」が uses するtraitを解決できません: ${component.trait.$refText}`);
  }
  return trait;
}

function desugarAggregate(component: Component, trait: Trait): string {
  const lines: string[] = [
    `集約 ${component.name} {`,
    `  状態: ${trait.states.map((state) => state.name).join(' -> ')}`,
  ];

  for (const member of trait.members) {
    const from = member.from.ref?.name ?? member.from.$refText;
    const to = member.to.ref?.name ?? member.to.$refText;
    if (member.$type === 'UiTransition') {
      lines.push(`  遷移 ${from} -> ${to} [${member.guard.kind}: ${toQuotedString(member.guard.text)}]`);
    } else {
      lines.push(`  禁止 ${from} -> ${to}`);
    }
  }

  if (component.variables && component.variables.entries.length > 0) {
    lines.push('  変数 {');
    for (const entry of component.variables.entries) {
      lines.push(`    ${entry.name} : ${toQuotedString(entry.type)}`);
    }
    lines.push('  }');
  }

  lines.push('}');
  return lines.join('\n');
}

/**
 * コアの `checkTriggerReferencesExistingEvent`(ashura-validator.ts)は「契機」kind
 * のguardに対応するイベント宣言(フロー内)を要求する。trait由来の契機トリガーは
 * 実在のイベントを表す(design-system-model.mdの「ポインタ進入」等)ため、脱糖側で
 * 欠落を埋めず guard.kind を「条件」に読み替えてバリデータを黙らせるのは意味論を
 * 歪める誤魔化しであり採用しない。代わりに、契機ごとに最小のコマンド+イベント宣言を
 * 持つフローを生成し、コアの意味論検査が実際に通る完全な脱糖にする。
 */
function desugarTriggerFlow(component: Component, trait: Trait): string | undefined {
  const triggerNames = new Set<string>();
  for (const member of trait.members) {
    if (member.$type === 'UiTransition' && member.guard.kind === '契機') {
      const triggerName = member.guard.text.trim().split(/\s+/)[0];
      if (triggerName) {
        triggerNames.add(triggerName);
      }
    }
  }
  if (triggerNames.size === 0) {
    return undefined;
  }

  const lines = [`フロー ${component.name}契機 {`];
  for (const name of triggerNames) {
    lines.push(`  コマンド ${name}する -> イベント ${name}`);
  }
  lines.push('}');
  return lines.join('\n');
}

function desugarComponent(component: Component): string {
  const trait = resolveTrait(component);
  const parts = [desugarAggregate(component, trait)];
  const flow = desugarTriggerFlow(component, trait);
  if (flow) {
    parts.push(flow);
  }
  return parts.join('\n\n');
}

/** 方言モデル中の全 Component を、コア `.ashura` テキスト(複数の集約定義)へ脱糖する。 */
export function desugarModel(model: Model): string {
  return model.elements.filter(isComponent).map(desugarComponent).join('\n\n');
}
