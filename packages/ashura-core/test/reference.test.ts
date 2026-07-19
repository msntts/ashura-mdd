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
const unknownEvent = loadFixture('../fixtures/invalid/reference-unknown-event.ashura');

describe('flow<->aggregate reference integrity check', () => {
  test('sugoroku.ashura has zero reference errors', async () => {
    const services = createAshuraServices(EmptyFileSystem).Ashura;
    const parse = parseHelper<Model>(services);
    const document = await parse(sugoroku.source, { documentUri: sugoroku.uri, validation: true });
    const errors = (document.diagnostics ?? []).filter((d) =>
      d.message.startsWith('存在しないイベントへの契機参照です'),
    );
    expect(errors).toHaveLength(0);
  });

  test('a 契機 referencing a non-existent event triggers an error', async () => {
    const services = createAshuraServices(EmptyFileSystem).Ashura;
    const parse = parseHelper<Model>(services);
    const document = await parse(unknownEvent.source, { documentUri: unknownEvent.uri, validation: true });
    const errors = (document.diagnostics ?? []).filter((d) =>
      d.message.startsWith('存在しないイベントへの契機参照です'),
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toContain('存在しないイベント');
  });
});
