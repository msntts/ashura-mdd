import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createAshuraServices, type Model } from 'ashura-core';
import { EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import { expect } from 'vitest';

const selfModelPath = fileURLToPath(new URL('../../../../domain/ashura.model.ashura', import.meta.url));
const selfModelSource = readFileSync(selfModelPath, 'utf-8');

export async function parseSelfModel(): Promise<Model> {
  const services = createAshuraServices(EmptyFileSystem).Ashura;
  const parse = parseHelper<Model>(services);
  const document = await parse(selfModelSource, { documentUri: selfModelPath, validation: true });
  expect(document.parseResult.lexerErrors).toHaveLength(0);
  expect(document.parseResult.parserErrors).toHaveLength(0);
  expect(document.diagnostics ?? []).toHaveLength(0);
  return document.parseResult.value;
}
