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
const unknownVariable = loadFixture('../fixtures/invalid/vocabulary-unknown-variable.ashura');
const unknownEventParam = loadFixture('../fixtures/invalid/vocabulary-unknown-event-param.ashura');

describe('vocabulary consistency check', () => {
  test('sugoroku.ashura has zero vocabulary warnings', async () => {
    const services = createAshuraServices(EmptyFileSystem).Ashura;
    const parse = parseHelper<Model>(services);
    const document = await parse(sugoroku.source, { documentUri: sugoroku.uri, validation: true });
    const warnings = (document.diagnostics ?? []).filter((d) => d.message.startsWith('用語集に存在しない語です'));
    expect(warnings).toHaveLength(0);
  });

  test('unknown variable name triggers a warning', async () => {
    const services = createAshuraServices(EmptyFileSystem).Ashura;
    const parse = parseHelper<Model>(services);
    const document = await parse(unknownVariable.source, { documentUri: unknownVariable.uri, validation: true });
    const warnings = (document.diagnostics ?? []).filter((d) => d.message.startsWith('用語集に存在しない語です'));
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.message).toContain('未知語');
  });

  test('unknown event parameter name triggers a warning', async () => {
    const services = createAshuraServices(EmptyFileSystem).Ashura;
    const parse = parseHelper<Model>(services);
    const document = await parse(unknownEventParam.source, { documentUri: unknownEventParam.uri, validation: true });
    const warnings = (document.diagnostics ?? []).filter((d) => d.message.startsWith('用語集に存在しない語です'));
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.message).toContain('不明パラメータ');
  });
});
