import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import { describe, expect, test } from 'vitest';
import { createAshuraServices } from '../src/language/ashura-module.js';
import type { Model } from '../src/language/generated/ast.js';

function loadFixture(relativePath: string): { source: string; uri: string } {
  const uri = fileURLToPath(new URL(relativePath, import.meta.url));
  return { source: readFileSync(uri, 'utf-8'), uri };
}

const sugoroku = loadFixture('../examples/sugoroku.ashura');
const undefinedTransition = loadFixture('../fixtures/invalid/statemachine-undefined-transition.ashura');
const unreachable = loadFixture('../fixtures/invalid/statemachine-unreachable.ashura');

describe('state machine coverage check', () => {
  test('sugoroku.ashura has zero state machine diagnostics', async () => {
    const services = createAshuraServices(EmptyFileSystem).Ashura;
    const parse = parseHelper<Model>(services);
    const document = await parse(sugoroku.source, { documentUri: sugoroku.uri, validation: true });
    const diagnostics = (document.diagnostics ?? []).filter(
      (d) =>
        d.message.startsWith('状態宣言チェーンに対応する遷移が定義されていません') ||
        d.message.startsWith('到達不能な状態です'),
    );
    expect(diagnostics).toHaveLength(0);
  });

  test('missing explicit transition for a chain pair triggers an error', async () => {
    const services = createAshuraServices(EmptyFileSystem).Ashura;
    const parse = parseHelper<Model>(services);
    const document = await parse(undefinedTransition.source, {
      documentUri: undefinedTransition.uri,
      validation: true,
    });
    const errors = (document.diagnostics ?? []).filter((d) =>
      d.message.startsWith('状態宣言チェーンに対応する遷移が定義されていません'),
    );
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.some((e) => e.message.includes('進行中 -> 精算中'))).toBe(true);
  });

  test('a state with no reachable path triggers a warning', async () => {
    const services = createAshuraServices(EmptyFileSystem).Ashura;
    const parse = parseHelper<Model>(services);
    const document = await parse(unreachable.source, { documentUri: unreachable.uri, validation: true });
    const warnings = (document.diagnostics ?? []).filter((d) => d.message.startsWith('到達不能な状態です'));
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.message).toContain('アーカイブ済');
  });
});
