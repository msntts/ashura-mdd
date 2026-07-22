import { describe, expect, test } from 'vitest';
import { diagnose, type DiagnosisInput, type DiagnosisResult } from '../src/diagnosis.js';

describe('diagnose (正常系: domain/ashura.model.ashura の決定表5パターン)', () => {
  const cases: Array<[string, DiagnosisInput, DiagnosisResult]> = [
    [
      '一致,一致,一致 → 健全',
      { intentVsImplementation: '一致', intentVsDerivation: '一致', implementationVsDerivation: '一致' },
      { diagnosis: '健全', destination: '記録のみ' },
    ],
    [
      '乖離,一致,乖離 → 実装の逸脱',
      { intentVsImplementation: '乖離', intentVsDerivation: '一致', implementationVsDerivation: '乖離' },
      { diagnosis: '実装の逸脱', destination: '生成へ差し戻し(自動)' },
    ],
    [
      '一致,乖離,乖離 → 仕様が曖昧',
      { intentVsImplementation: '一致', intentVsDerivation: '乖離', implementationVsDerivation: '乖離' },
      { diagnosis: '仕様が曖昧(別解釈可能)', destination: '人間裁定' },
    ],
    [
      '乖離,乖離,一致 → モデルが現実と乖離',
      { intentVsImplementation: '乖離', intentVsDerivation: '乖離', implementationVsDerivation: '一致' },
      { diagnosis: 'モデルが現実と乖離', destination: '人間裁定' },
    ],
    [
      '乖離,乖離,乖離 → 三者バラバラ',
      { intentVsImplementation: '乖離', intentVsDerivation: '乖離', implementationVsDerivation: '乖離' },
      { diagnosis: '三者バラバラ', destination: '人間裁定(最優先)' },
    ],
  ];

  test.each(cases)('%s', (_label, input, expected) => {
    expect(diagnose(input)).toEqual(expected);
  });
});

describe('diagnose (異常系: 推移律違反=ちょうど1個だけ乖離)', () => {
  const cases: Array<[string, DiagnosisInput]> = [
    [
      '一致,一致,乖離 → 入力不整合',
      { intentVsImplementation: '一致', intentVsDerivation: '一致', implementationVsDerivation: '乖離' },
    ],
    [
      '一致,乖離,一致 → 入力不整合',
      { intentVsImplementation: '一致', intentVsDerivation: '乖離', implementationVsDerivation: '一致' },
    ],
    [
      '乖離,一致,一致 → 入力不整合',
      { intentVsImplementation: '乖離', intentVsDerivation: '一致', implementationVsDerivation: '一致' },
    ],
  ];

  test.each(cases)('%s', (_label, input) => {
    expect(diagnose(input)).toEqual({ diagnosis: '入力不整合', destination: 'エラー(推移律違反)' });
  });
});
