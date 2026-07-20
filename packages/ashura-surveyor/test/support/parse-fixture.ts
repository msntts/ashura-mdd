import { createAshuraServices, type Model } from 'ashura-core';
import { EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import { expect } from 'vitest';

export async function parseFixture(source: string): Promise<Model> {
  const services = createAshuraServices(EmptyFileSystem).Ashura;
  const parse = parseHelper<Model>(services);
  const document = await parse(source);
  expect(document.parseResult.lexerErrors).toHaveLength(0);
  expect(document.parseResult.parserErrors).toHaveLength(0);
  return document.parseResult.value;
}
