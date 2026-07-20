import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { checkDrift, type InferenceSource } from '../src/drift-detection.js';
import { declarationKey, type DeclarationId } from '../src/trace-table.js';
import type { Diagnosis, Destination } from '../src/diagnosis.js';

interface DriftScenario {
  readonly label: string;
  readonly declaration: DeclarationId;
  readonly intent: string;
  readonly implementationInference: string;
  readonly independentDerivation: string;
  readonly expectedDiagnosis: Diagnosis;
  readonly expectedDestination: Destination;
}

const fixturePath = fileURLToPath(new URL('../fixtures/sugoroku/drift-scenarios.json', import.meta.url));
const scenarios: DriftScenario[] = JSON.parse(readFileSync(fixturePath, 'utf-8'));

const NOW = 1_700_000_000_000;
const HUMAN_ARBITRATION_DESTINATIONS: readonly Destination[] = ['人間裁定', '人間裁定(最優先)'];

/** ①②③はどれも「宣言について何が言えるかの記述」を返す非決定的プロセスと同じ形をしている。
 * このテストでは実LLM呼び出しの代わりに固定マップを返すフィクスチャで代替する。
 */
function fixtureSource(entries: ReadonlyMap<string, string>): InferenceSource {
  return {
    infer: (declaration) => entries.get(declarationKey(declaration)),
  };
}

describe('checkDrift (フィクスチャ駆動、sugoroku.ashuraの宣言に対する①②③)', () => {
  test.each(scenarios.map((scenario) => [scenario.label, scenario] as const))('%s', (_label, scenario) => {
    const implementationInference = fixtureSource(
      new Map([[declarationKey(scenario.declaration), scenario.implementationInference]]),
    );
    const independentDerivation = fixtureSource(
      new Map([[declarationKey(scenario.declaration), scenario.independentDerivation]]),
    );

    const result = checkDrift(
      { declaration: scenario.declaration, statement: scenario.intent },
      implementationInference,
      independentDerivation,
      NOW,
    );

    expect(result.diagnosisResult).toEqual({
      diagnosis: scenario.expectedDiagnosis,
      destination: scenario.expectedDestination,
    });

    if (HUMAN_ARBITRATION_DESTINATIONS.includes(scenario.expectedDestination)) {
      // 決定表→乖離ライフサイクルの一気通貫: 人間裁定に上がる診断は裁定待ちとして起票される
      expect(result.divergence).toMatchObject({ state: '裁定待ち' });
    } else {
      // 健全(記録のみ)・実装の逸脱(自動差し戻し)は人間裁定を経由しないため起票しない
      expect(result.divergence).toBeUndefined();
    }
  });

  test('②推論が不能(undefined)な宣言は①vs②の乖離として扱われる(意図と独立解釈は一致のため実装の逸脱と診断)', () => {
    const declaration: DeclarationId = { scope: 'ゲーム', kind: '遷移', name: '募集中->進行中' };
    const implementationInference = fixtureSource(new Map());
    const independentDerivation = fixtureSource(
      new Map([[declarationKey(declaration), 'プレイヤー数が2人以上になったら開始']]),
    );

    const result = checkDrift(
      { declaration, statement: 'プレイヤー数が2人以上になったら開始' },
      implementationInference,
      independentDerivation,
      NOW,
    );

    expect(result.diagnosisResult).toEqual({
      diagnosis: '実装の逸脱',
      destination: '生成へ差し戻し(自動)',
    });
    expect(result.divergence).toBeUndefined();
  });

  test('②③がともに推論不能(undefined)な宣言は「証拠なし」を「両者一致」と誤認せず三者バラバラとして人間裁定(最優先)に上がる', () => {
    const declaration: DeclarationId = { scope: 'ゲーム', kind: '遷移', name: '募集中->進行中' };
    const implementationInference = fixtureSource(new Map());
    const independentDerivation = fixtureSource(new Map());

    const result = checkDrift(
      { declaration, statement: 'プレイヤー数が2人以上になったら開始' },
      implementationInference,
      independentDerivation,
      NOW,
    );

    expect(result.diagnosisResult).toEqual({
      diagnosis: '三者バラバラ',
      destination: '人間裁定(最優先)',
    });
    expect(result.divergence).toMatchObject({ state: '裁定待ち' });
  });
});
