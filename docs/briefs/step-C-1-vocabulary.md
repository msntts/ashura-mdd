# Step C-1: 語彙整合検査

## 前提条件

- B-3 完了(`sugoroku.ashura` がエラーなくパースされる正典サンプルとして存在する)

## 制約(触らないもの)

- 文法(`ashura.langium`)は変更しない。既存の構造(`EventDecl.params`・`VariableEntry.name`)だけを検査対象にする
- 「名詞」の判定を自然言語処理で厳密にやろうとしない。スコープは下記の2箇所の ID 参照に限定する

## 検査の定義(スコープを決め打ちする)

語彙整合検査は以下の2箇所の識別子が、モデル内のいずれかの `用語集` に宣言された用語名と一致するかを見る:

1. `EventDecl.params`(イベントのパラメータ名。例: `出目確定(出目)` の `出目`)
2. `VariableEntry.name`(集約の変数宣言の変数名。例: `プレイヤー位置`)

いずれかが、モデル全体の `Glossary.terms[].name` のどれとも**完全一致しない**場合、warning を出す。
(部分一致・複合語分解はしない。将来の拡張余地として `メモ・決定事項` に一言残す)

## 手順

1. `packages/ashura-core/src/language/ashura-validator.ts` を新規作成する。Langium標準の `ValidationChecks` パターンに従う:

   ```ts
   export class AshuraValidator {
       checkEventParamsInGlossary(node: EventDecl, accept: ValidationAcceptor): void { ... }
       checkVariableNameInGlossary(node: VariableEntry, accept: ValidationAcceptor): void { ... }
   }
   ```

   各チェックは `node` のASTルートを辿って `Model` を取得し、全 `Glossary` の `terms` を集めた `Set<string>` を作り、対象IDが含まれるか判定する。含まれなければ `accept('warning', '用語集に存在しない語です: ${name}', { node, property: ... })`。

2. `packages/ashura-core/src/language/ashura-module.ts` の `registerValidationChecks` (もしくは既存の Langium generated module 設定箇所)に上記2チェックを登録する。Langium公式の validator 登録パターン(`ValidationRegistry.register({...}, validator)`)に従う。

3. フィクスチャを追加する:
   - `packages/ashura-core/fixtures/invalid/vocabulary-unknown-variable.ashura`: `sugoroku.ashura` をコピーし、`変数` ブロックに用語集にない名前の変数(例: `未知語 : 数値`)を1つ追加する
   - `packages/ashura-core/fixtures/invalid/vocabulary-unknown-event-param.ashura`: `sugoroku.ashura` をコピーし、イベントのパラメータ名を用語集にない名前(例: `出目確定(不明パラメータ)`)に変える

4. `packages/ashura-core/test/vocabulary.test.ts` を新規作成する:
   - 正常系: `sugoroku.ashura` をパースし、語彙整合の warning が0件であることを確認
   - 異常系: 上記2フィクスチャそれぞれをパースし、期待するメッセージ・対象ノードで warning が1件出ることを確認

## 完了確認

- `pnpm -F ashura-core test` で `vocabulary.test.ts` が green(正常系1件+異常系2件)
- `sugoroku.ashura` に対する diagnostics が引き続き0件
