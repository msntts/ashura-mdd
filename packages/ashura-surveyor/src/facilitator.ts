import { createAshuraServices, isAggregate, isForbidden, type Model } from 'ashura-core';
import { EmptyFileSystem, URI } from 'langium';

/**
 * ファシリテーション(domain/ashura.model.ashura フロー「ファシリテーション」の
 * ポリシー「対話中のとき→失敗系・禁止遷移・境界規則を能動的に質問する」の決定的な下地)。
 *
 * 草稿モデルの構造的な欠落を機械的に検出し、質問アジェンダを生成する。
 * 対話そのもの(非決定的、LLM由来)はPhase 3のスコープ外。「失敗系・境界規則」の
 * 検出は自由文字列の解析が必要で誤検知リスクが高いため、Phase 3では構造的に
 * 判定できる「禁止遷移」の欠落のみを対象とする(決定的な表面を偽らない)。
 */
export interface FacilitationQuestion {
  readonly scope: string;
  readonly topic: '禁止遷移';
  readonly question: string;
}

export function analyzeGaps(model: Model): readonly FacilitationQuestion[] {
  const questions: FacilitationQuestion[] = [];

  for (const element of model.elements) {
    if (isAggregate(element)) {
      const hasForbiddenTransition = element.members.some((member) => isForbidden(member));
      if (!hasForbiddenTransition) {
        questions.push({
          scope: element.name,
          topic: '禁止遷移',
          question: `集約「${element.name}」に禁止遷移の宣言がありません。許可してはいけない状態遷移はありますか?`,
        });
      }
    }
  }

  return questions;
}

/**
 * 対話そのもの(非決定的、LLM由来)。Phase 3 では「対話は行わない」とスコープ外にしていたが、
 * Phase 6 で `DialogueAgent` seam の裏に隔離して実装する。`analyzeGaps`/`FacilitationQuestion`
 * (禁止遷移、決定的)は変更しない。LLM由来の追加質問トピックは「失敗系」1件のみに絞る
 * (境界規則は将来フェーズ送り、ROADMAP.md Phase 6 参照)。
 */
export interface DialogueQuestion {
  readonly scope: string;
  readonly topic: '失敗系';
  readonly question: string;
}

/**
 * 質問への回答。草稿(.ashuraテキスト)に挿入する宣言テキストのみを持つ。
 * コアASTノードの直接構築は `$container`/参照解決が壊れるため採用しない(Phase 4 の決定を再利用)。
 *
 * 挿入先(集約名)は答え自身には持たせず、`applyAnswer` が元の `FacilitationQuestion.scope`
 * (決定的、`analyzeGaps` が生成)から決定する。「AI出力不信」原則により、LLM由来の値
 * (declarationText)だけでなく挿入先も検証対象にするため、挿入先をLLM出力側に委ねない。
 */
export interface DialogueAnswer {
  readonly declarationText: string;
}

export interface DialogueAgent {
  askFailureModeQuestions(model: Model): Promise<readonly DialogueQuestion[]>;
  answer(question: FacilitationQuestion): Promise<DialogueAnswer>;
}

// 状態名のID終端(ashura.langium)と同じUnicode範囲: 平仮名+片仮名(U+3040-30FF)・漢字(U+4E00-9FFF)。
const FORBIDDEN_DECLARATION_PATTERN = /^禁止\s+[\w぀-ヿ一-鿿]+\s+->\s+[\w぀-ヿ一-鿿]+$/;

/**
 * DialogueAgent(非決定的、LLM由来)の出力は「AI出力不信: エージェントの出力はすべて未検証として
 * 生まれる」(横断制約)ため、草稿への挿入前に構文的な妥当性を検査する。再パース時のLSP検査
 * (lexer/parser/validation)は構文的に妥当な誤挿入(閉じ括弧を含めて別ブロックに宣言を漏らす等)
 * までは検出できないため、挿入対象を「禁止 <状態> -> <状態>」の単一宣言に限定する。
 */
function insertIntoAggregate(sourceText: string, aggregateName: string, declarationText: string): string {
  if (!FORBIDDEN_DECLARATION_PATTERN.test(declarationText.trim())) {
    throw new Error(`DialogueAgentの回答が想定形式(禁止 <状態> -> <状態>)と一致しません: ${declarationText}`);
  }

  const startMarker = `集約 ${aggregateName} {`;
  const startIndex = sourceText.indexOf(startMarker);
  if (startIndex === -1) {
    throw new Error(`草稿に集約が見つかりません: ${aggregateName}`);
  }

  const openBraceIndex = startIndex + startMarker.length - 1;
  let depth = 1;
  let i = openBraceIndex + 1;
  while (depth > 0 && i < sourceText.length) {
    if (sourceText[i] === '{') depth++;
    else if (sourceText[i] === '}') depth--;
    i++;
  }
  const closeBraceIndex = i - 1;

  return `${sourceText.slice(0, closeBraceIndex)}\n  ${declarationText}\n${sourceText.slice(closeBraceIndex)}`;
}

let nextDraftDocumentId = 1;

// vscode-languageserver-types DiagnosticSeverity.Error の値。langiumのDiagnosticSeverity型を
// 追加依存にせず、ashura-dialect-ui/src/parse-helper.ts と同じ判断でマジックナンバーとして扱う。
const DIAGNOSTIC_SEVERITY_ERROR = 1;

/**
 * 回答を草稿テキストに適用し、再パースして新しい `ast.Model` を返す(Phase 4 の脱糖と同型)。
 * lexer/parserエラーに加え、severity=Error の診断も再パース失敗として扱う。これを怠ると、
 * 対象集約自体がパースできずASTから欠落し `analyzeGaps` が偶然0件を返す「テストは緑だが
 * 半分のパイプライン」(Phase 1/4 で判明した罠)を再発させる。
 */
export async function applyAnswer(
  sourceText: string,
  question: FacilitationQuestion,
  answer: DialogueAnswer,
): Promise<Model> {
  const updatedText = insertIntoAggregate(sourceText, question.scope, answer.declarationText);

  const { shared } = createAshuraServices(EmptyFileSystem);
  const uri = URI.parse(`file:///ashura-draft-${nextDraftDocumentId++}.ashura`);
  const document = shared.workspace.LangiumDocumentFactory.fromString<Model>(updatedText, uri);
  shared.workspace.LangiumDocuments.addDocument(document);
  await shared.workspace.DocumentBuilder.build([document], { validation: true });

  const errorDiagnostics = (document.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.severity === DIAGNOSTIC_SEVERITY_ERROR,
  );
  if (
    document.parseResult.lexerErrors.length > 0 ||
    document.parseResult.parserErrors.length > 0 ||
    errorDiagnostics.length > 0
  ) {
    throw new Error(
      `草稿更新後の再パースに失敗しました: ${JSON.stringify({
        lexerErrors: document.parseResult.lexerErrors,
        parserErrors: document.parseResult.parserErrors,
        errorDiagnostics: errorDiagnostics.map((diagnostic) => diagnostic.message),
      })}`,
    );
  }

  return document.parseResult.value;
}
