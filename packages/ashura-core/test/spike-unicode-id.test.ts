import { EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import { describe, expect, test } from 'vitest';
import { createAshuraServices } from '../src/language/ashura-module.js';
import type { Model } from '../src/language/generated/ast.js';

describe('spike: unicode ID terminal', () => {
  test('parses Japanese identifiers (hiragana/katakana/kanji mix)', async () => {
    const services = createAshuraServices(EmptyFileSystem).Ashura;
    const parse = parseHelper<Model>(services);
    const document = await parse('placeholder プレイヤー位置');
    expect(document.parseResult.lexerErrors).toHaveLength(0);
    expect(document.parseResult.parserErrors).toHaveLength(0);
    expect(document.diagnostics ?? []).toHaveLength(0);
  });

  test('keyword prefix does not swallow longer identifier (longest match wins)', async () => {
    const services = createAshuraServices(EmptyFileSystem).Ashura;
    const parse = parseHelper<Model>(services);
    const document = await parse('状態 状態確認');
    expect(document.parseResult.lexerErrors).toHaveLength(0);
    expect(document.parseResult.parserErrors).toHaveLength(0);
    expect(document.diagnostics ?? []).toHaveLength(0);
  });
});
