# Ashura MDD Implementation Plan

## Phase 0 - Implementation Plan (完了)

### プロジェクト概要

Langium ベースのコアDSL(`.ashura`)を `packages/ashura-core` に立て、`examples/sugoroku-model.md` を翻訳した正典サンプルに対して LSP検査3種(語彙整合・状態機械網羅性・フロー⇄集約参照整合)を実装する。ROADMAP.md の Phase 0 残タスクに対応。

### 環境

- Windows / Node.js / TypeScript / pnpm(ワークスペース化する)
- Langium(DSL+LSP、Chevrotainベース)
- vitest(パーサ・validatorのテスト)

### 操作仕様

- `packages/ashura-core` に Langium プロジェクトを立てる(ルートを pnpm workspace化)
- 日本語識別子(用語集エントリ名・状態名など)をトークナイズできる ID 終端に置き換える(Unicode範囲、平仮名・片仮名・漢字)
- コア文法は **LSP検査3種から逆算した範囲のみ厳密化**する:
  - 厳密に構文化: コンテキストマップ / 用語集(用語+種別) / 集約(状態列挙・遷移・禁止・変数宣言の変数名のみ) / フロー(コマンド・イベント名・ポリシーのトリガー) / 決定表(ヘッダ+行) の**構造**
  - 自由文字列/緩い参照拾いで良い: 不変条件式・ガード条件(`条件:`)の中身・性質の本文・決定表内の検査文
- Markdown のパイプ表(`|...|`)や `# ===` バナーはそのまま文法化しない。Langiumに自然な行構文へ**翻訳**する(逐語パースではない)
- `examples/sugoroku-model.md` を `packages/ashura-core/examples/sugoroku.ashura` として翻訳する。**正典サンプルは内部整合させる**(集約の遷移 `進行中 -> 終了 [契機: ゴール到達]` に対応するイベントをフロー側に追加するなど、原文の暗黙の対応を明示化する)
- 検査3種それぞれについて、正しく倒れる**負のフィクスチャ**(未定義遷移・用語集にない名詞・存在しないイベント参照)を用意し、期待通りに diagnostics が出ることを確認する

### 受け入れ条件

- `packages/ashura-core` が pnpm workspace 配下で build/test 通る
- 正典 `sugoroku.ashura` がエラーなくパースされ、かつ検査3種すべてで診断ゼロ
- 検査3種それぞれに正常系(検出されない)・異常系(検出される)のテストが vitest で green

### 完了条件

- `pnpm -F ashura-core build`
- `pnpm -F ashura-core test`

全タスク完了。ROADMAP.md の Phase 0 残タスク(コアDSL文法定義・LSP検査3種)を実装済み。

## Phase 1 - Implementation Plan (サーベイヤー: 三点測量の最小構成)

### プロジェクト概要

新規パッケージ `packages/ashura-surveyor` に、三点測量(①意図・②実装・③解釈)の最小構成を実装する。ROADMAP.md の Phase 1 の4項目(トレース表フォーマット・drift検出・差分診断決定表・乖離ライフサイクル)に対応する。

### スコープ決定(ユーザー承認済み)

②実装からの推論の対象となる実装コードは、まだこのリポジトリに存在しない(コード生成は Phase 3)。よって Phase 1 の drift 検出は **フィクスチャ駆動** とする。`sugoroku.ashura`(①意図)に対し、②実装からの推論・③AI独立導出はどちらも手書きのフィクスチャ(JSON)として用意し、実LLM配線は行わない。パイプライン全体(トレース表→drift検出→差分診断→乖離ライフサイクル)を決定的に回せることを最小構成のゴールとする。実LLM配線・実プロジェクト対応は Phase 1 のスコープ外(将来フェーズ送り)。

### 決定性境界の隔離設計

`domain/ashura.model.md` の横断制約「決定性境界: LSP検査は決定的。エージェント推論は非決定的。両者の担当を混ぜない」を踏襲する。決定表(diagnose関数)・乖離ライフサイクル(状態機械)は純粋関数として決定的に実装する。②実装からの推論・③AI独立導出という非決定的(LLM)要素は型(インターフェース)の裏に隔離し、Phase 1ではその型を満たすフィクスチャ値で代替する。将来LLM実装を差し込んでも決定的コア(決定表・状態機械)には手を入れない設計とする。

### 操作仕様

- `packages/ashura-surveyor` を pnpm workspace 配下に立てる(`ashura-core` と同じ tsconfig/vitest 構成を踏襲)
- **トレース表フォーマット**: モデル宣言(遷移・不変条件・性質・依存/失敗セマンティクス等)を一意に識別する `declarationId` と、コード上の対応位置(`file` / `line` / `symbol`)の配列を持つ型を定義する。対応位置が0件の宣言を検出する完全性チェック関数も併せて定義する(`生成` 文脈の不変条件「トレース表の完全性」に対応)
- **差分診断の決定表**: `domain/ashura.model.md` 104-110行の表を `diagnose(input: DiagnosisInput): DiagnosisResult` として実装する。①vs②・①vs③・②vs③の3つの一致/乖離のうち、一致関係の推移律を満たす組合せは8通り中5通り(表が網羅する5パターン)のみ。残り3通り(ちょうど1つだけ乖離)は論理的にありえないはずだが、LLM由来の判定(②③)は推移性を保証しないため入力されうる。この3パターンはサイレントスルーさせず、専用の異常系診断(`入力不整合`)として明示的に返す
- **乖離ライフサイクル**: `domain/ashura.model.md` 116-121行の状態機械(検出→裁定待ち→解消、裁定待ちが7日超過でエスカレーション通知、検出→解消の直接遷移は禁止)を実装する
- **drift検出パイプライン**: `sugoroku.ashura` の宣言に対応する①②③のフィクスチャ(JSON、正常系・異常系複数パターン)を用意し、比較→決定表→(必要なら)乖離ライフサイクルへの投入までを一気通貫でテストする

### 受け入れ条件

- `packages/ashura-surveyor` が pnpm workspace 配下で build/test 通る
- 差分診断の決定表に正常系5パターン+異常系(入力不整合)3パターンのテストが vitest で green
- 乖離ライフサイクルの正常系(検出→裁定待ち→解消)・異常系(検出→解消の直接遷移禁止・7日超過エスカレーション)のテストが vitest で green
- フィクスチャ駆動のdrift検出パイプラインが、①②③の一致/乖離パターンごとに期待した診断+宛先を返すことをテストで確認する

### 完了条件

- `pnpm -F ashura-surveyor build`
- `pnpm -F ashura-surveyor test`

---

## 🔥 Hotfix(最優先)

<!-- 動作確認中の不具合・緊急対応はここに積む -->

---

## メモ・決定事項

- advisor 判断: LSP検査3種が「何を構文化すべきか」を規定する。不変条件の量化式・ガード条件式・性質本文はどの検査も参照しないため、Phase 0 では自由文字列/緩い参照拾いに留める(作り込まない)
- 日本語識別子は Langium デフォルトの ASCII専用 `ID` 終端では通らないため、Unicode範囲の ID 終端に差し替える必要がある(B-1で最優先検証)。確定した終端: `/[_a-zA-Z぀-ヿ一-鿿][\w぀-ヿ一-鿿]*/`(平仮名+片仮名: U+3040-30FF、漢字: U+4E00-9FFF)。Chevrotainのlongest-match規則によりキーワード接頭辞を含むID(`状態` キーワード vs `状態確認` というID)も正しく分離されることを `packages/ashura-core/test/spike-unicode-id.test.ts` で確認済み
- `.ashura` はMarkdown文書の逐語パースではなく新しい具象構文への翻訳。パイプ表・バナーはそのまま持ち込まない
- 正典 `sugoroku.ashura` は内部整合させたサンプルとし、検査3が拾うべき壊れたケース(存在しないイベントへの契機参照)は別の負フィクスチャ側に用意する
- 完了判定は「パースできる」だけでは不十分。検査ごとに正常系・異常系のテストがあることを Phase 0 の受け入れ条件とする
- テストフレームワークは vitest を採用
- B-2で判明: 裸の(引用符なし)自由文字列終端(`FREE_TEXT`)はChevrotainのlongest-match戦略下でキーワード終端と全域で競合し、文書冒頭の `用語集` キーワードすら誤トークナイズさせた。自由文字列は必ず引用符付き `STRING` にする方針に統一(`GuardSpec.text`・`VariableEntry.type`・`InvariantEntry.text`・`PropertyEntry.body`・`DependencyEntry.spec`・`GlossaryTerm.rest` など)。B-3でsugoroku.ashuraを翻訳する際は全ての自由文字列を `"..."` で囲むこと
- `DecisionRow` の `note` と `PolicyStep` の `note` は括弧なしの裸の `STRING`(`行 "cond" -> "action" "note"` の形)。丸括弧で囲まない
- `DependencyEntry` は `依存 名前 (spec)` のように丸括弧で `STRING` を囲む(`DecisionRow`/`PolicyStep`のnoteとは違う形なので注意)
- B-3で `sugoroku.ashura` を翻訳する際、原文の用語集にない変数名(`プレイヤー位置`・`連鎖深度`)をC-1(語彙整合検査)の正常系ゼロ件baselineに合わせるため用語集エントリとして追加した(原文の用語集は暗黙にユビキタス言語のみを列挙する設計だったが、翻訳先の正典サンプルでは全参照を用語集に載せる方針に統一)
- 集約の遷移 `進行中 -> 終了 [契機: "ゴール到達"]` に対応するイベントとして、フロー `手番進行` の `ポリシー: 到着 のとき` に `-> イベント ゴール到達` を追加した(原文の暗黙対応を明示化。C-3の正常系baseline)
- C-1で判明: `langium/test` の `parseHelper` はデフォルトでは validation フェーズを実行しない(lexing/parsing/linkingは常に走るが、カスタム `ValidationChecks` を動かすには `parse(source, { validation: true })` を明示する必要がある)。C-2・C-3のテストでも同様に指定すること
- validatorは `packages/ashura-core/src/language/ashura-validator.ts` に集約し、`registerValidationChecks()` を `ashura-module.ts` の `createAshuraServices` 内で呼んで登録する方式。C-2・C-3もこのファイルにチェックメソッドを追記する

## 完了済みフェーズ

- Phase A: workspace + Langium scaffold `78d2f86..78d2f86`
- Phase B: コア文法とサンプル `92d92a4..c28056c`
- Phase C: LSP検査3種 `d13e439..49f0f5b`
