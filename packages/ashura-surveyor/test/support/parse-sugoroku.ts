import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createAshuraServices, type Model } from 'ashura-core';
import { EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import { expect } from 'vitest';

const sugorokuPath = fileURLToPath(new URL('../../../ashura-core/examples/sugoroku.ashura', import.meta.url));
const sugorokuSource = readFileSync(sugorokuPath, 'utf-8');

export async function parseSugoroku(): Promise<Model> {
  const services = createAshuraServices(EmptyFileSystem).Ashura;
  const parse = parseHelper<Model>(services);
  const document = await parse(sugorokuSource, { documentUri: sugorokuPath, validation: true });
  expect(document.parseResult.lexerErrors).toHaveLength(0);
  expect(document.parseResult.parserErrors).toHaveLength(0);
  return document.parseResult.value;
}
