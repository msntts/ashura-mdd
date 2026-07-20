import { EmptyFileSystem } from 'langium';
import { createAshuraUiServices } from './language/ashura-ui-module.js';
import type { Model } from './language/generated/ast.js';
import { assertNoParseErrors, parseAndBuild } from './parse-helper.js';

/** 方言ソース(`.ashura-ui`)をパースする(プラグイン三点セットの1つ目「parse」)。 */
export async function parseDialectSource(source: string): Promise<Model> {
  const services = createAshuraUiServices(EmptyFileSystem).AshuraUi;
  const document = await parseAndBuild<Model>(services.shared, source, '.ashura-ui');
  assertNoParseErrors(document, '方言ソース');
  return document.parseResult.value;
}
