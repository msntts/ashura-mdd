import { describe, expect, test } from 'vitest';
import { findUntracedDeclarations, type TraceTable } from '../src/trace-table.js';

describe('findUntracedDeclarations', () => {
  test('全宣言にコード位置があれば空配列を返す', () => {
    const table: TraceTable = {
      modelSource: 'sugoroku.ashura',
      entries: [
        {
          declaration: { scope: 'ゲーム', kind: '遷移', name: '募集中->進行中' },
          codeLocations: [{ file: 'src/game.ts', line: 12 }],
        },
      ],
    };
    expect(findUntracedDeclarations(table)).toHaveLength(0);
  });

  test('コード位置が0件の宣言を検出する', () => {
    const table: TraceTable = {
      modelSource: 'sugoroku.ashura',
      entries: [
        {
          declaration: { scope: 'ゲーム', kind: '遷移', name: '募集中->進行中' },
          codeLocations: [{ file: 'src/game.ts', line: 12 }],
        },
        {
          declaration: { scope: '手番進行', kind: '性質', name: '停止性' },
          codeLocations: [],
        },
      ],
    };
    const untraced = findUntracedDeclarations(table);
    expect(untraced).toEqual([{ scope: '手番進行', kind: '性質', name: '停止性' }]);
  });
});
