import { URI, type LangiumDocument, type LangiumSharedCoreServices } from 'langium';

let nextDocumentId = 1;

/**
 * langium/test の parseHelper と同じ手順(ドキュメント生成→登録→ビルド)を、
 * テスト専用モジュール(langium/test)に依存せずプロダクションコードから使える形で実装する。
 */
export async function parseAndBuild<T extends { $type: string }>(
  shared: LangiumSharedCoreServices,
  source: string,
  fileExtension: string,
): Promise<LangiumDocument<T>> {
  const uri = URI.parse(`file:///ashura-doc-${nextDocumentId++}${fileExtension}`);
  const document = shared.workspace.LangiumDocumentFactory.fromString<T>(source, uri);
  shared.workspace.LangiumDocuments.addDocument(document);
  await shared.workspace.DocumentBuilder.build([document], { validation: true });
  return document;
}

// vscode-languageserver-types DiagnosticSeverity.Error の値。パッケージを追加依存に
// せずマジックナンバーとして扱う(langiumの型を通じて間接的に安定している値)。
const DIAGNOSTIC_SEVERITY_ERROR = 1;

/**
 * lexer/parserエラーに加え、build({validation: true}) が生成した診断のうち
 * severity=Error のものも失敗として扱う。warning(方言側の変数なし警告、脱糖後の
 * コア側の語彙警告など)は許容する — 「パースできる」だけでは不十分だが、
 * 警告レベルまで含めて0件を要求すると正当な最小構成のフィクスチャが通らなくなる。
 */
export function assertNoParseErrors(document: LangiumDocument, sourceLabel: string): void {
  const errorDiagnostics = (document.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.severity === DIAGNOSTIC_SEVERITY_ERROR,
  );
  if (
    document.parseResult.lexerErrors.length > 0 ||
    document.parseResult.parserErrors.length > 0 ||
    errorDiagnostics.length > 0
  ) {
    throw new Error(
      `${sourceLabel}のパースに失敗しました: ${JSON.stringify({
        lexerErrors: document.parseResult.lexerErrors,
        parserErrors: document.parseResult.parserErrors,
        errorDiagnostics: errorDiagnostics.map((diagnostic) => diagnostic.message),
      })}`,
    );
  }
}
