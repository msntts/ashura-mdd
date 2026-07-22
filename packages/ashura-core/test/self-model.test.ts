import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import { describe, expect, test } from 'vitest';
import { createAshuraServices } from '../src/language/ashura-module.js';
import type { Model } from '../src/language/generated/ast.js';

const selfModelPath = fileURLToPath(new URL('../../../domain/ashura.model.ashura', import.meta.url));
const selfModelSource = readFileSync(selfModelPath, 'utf-8');

describe('domain/ashura.model.ashura (self-model, Phase 5)', () => {
  test('parses without diagnostics', async () => {
    const services = createAshuraServices(EmptyFileSystem).Ashura;
    const parse = parseHelper<Model>(services);
    const document = await parse(selfModelSource, { documentUri: selfModelPath, validation: true });
    expect(document.parseResult.lexerErrors).toHaveLength(0);
    expect(document.parseResult.parserErrors).toHaveLength(0);
    expect(document.diagnostics ?? []).toHaveLength(0);
    expect(document.parseResult.value.elements).toHaveLength(14);
  });
});
