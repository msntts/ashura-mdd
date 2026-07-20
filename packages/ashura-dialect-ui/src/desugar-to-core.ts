import { createAshuraServices, type Model as CoreModel } from 'ashura-core';
import { EmptyFileSystem } from 'langium';
import { desugarModel } from './desugar.js';
import type { Model } from './language/generated/ast.js';
import { assertNoParseErrors, parseAndBuild } from './parse-helper.js';

/**
 * 脱糖したコア `.ashura` テキストを ashura-core 自身に再パースさせ、本物の
 * `ast.Model`(コアAST)を得る。コアASTノードを直接組み立てる方式(`$container`
 * や参照解決を手で再現する)は壊れやすいため採用しない(PLAN.md参照)。
 */
export async function parseCoreSource(coreSource: string): Promise<CoreModel> {
  const services = createAshuraServices(EmptyFileSystem).Ashura;
  const document = await parseAndBuild<CoreModel>(services.shared, coreSource, '.ashura');
  assertNoParseErrors(document, '脱糖後のコアテキスト');
  return document.parseResult.value;
}

/** 方言モデルを脱糖し、コア `ast.Model` として返す(方言→コア語彙の変換の入口)。 */
export async function desugarToCoreModel(model: Model): Promise<CoreModel> {
  return parseCoreSource(desugarModel(model));
}
