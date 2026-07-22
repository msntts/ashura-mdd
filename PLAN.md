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

## Phase 2 - Implementation Plan (検証系: アドバーサリー)

### プロジェクト概要

`packages/ashura-surveyor` に、`domain/ashura.model.md` 文脈「検証」のフロー「攻撃」を実装する。ROADMAP.md の Phase 2 の3項目(性質宣言→プロパティベーステスト生成・失敗セマンティクス宣言→フォールトインジェクションシナリオ生成・独立導出の担保)に対応する。

### スコープ決定

- **SUT-vs-フィクスチャ観測結果**: Phase 1 と同じ理由(生成対象のコードは Phase 3 まで存在しない)で、反例探索・フォールト注入の**実行結果**をフィクスチャで代替する。スタブSUTは作らない(Phase 3 との境界がにじむため)。決定的コアは「検証タスクの列挙」と「観測結果の集約(合格/反例)」であり、実行そのもの(非決定的)は `CounterexampleSearch` インターフェースの裏に隔離する(Phase 1 の `InferenceSource` と同型)
- **独立導出の構造的保証**: Phase 1 の②③はモデル外の情報(フィクスチャ)だったが、Phase 2 の入力(性質・失敗セマンティクス)は `sugoroku.ashura` のモデル宣言そのものである。よって手書きフィクスチャではなく、`ashura-core` でパースした実際の AST(`PropertyEntry` / `DependencyEntry`、`ast.ts` に既存)を直接入力とする。検証タスク列挙関数の入力型を `ast.Model` のみに限定することで、「検証ケースはモデルの宣言のみから導出し、生成されたコードを見て作らない」という性質を型シグネチャで構造的に保証する(コード生成物への参照経路を持たせない)。`ashura-surveyor` は `ashura-core` に依存を追加する

### 操作仕様

- `packages/ashura-surveyor/package.json` に `ashura-core`(workspace依存)・`langium`(テストでの `parseHelper` 用)を追加する
- **検証タスク列挙**: `ast.Model` を入力に、`PropertyBlock.properties`(性質宣言)・`DependencyBlock.entries`(失敗セマンティクス宣言)を検証タスク(`VerificationTask`)として列挙する純粋関数を実装する
- **観測結果の集約**: 検証タスクごとに `CounterexampleSearch`(非決定的要素を隔離するインターフェース)で反例探索/フォールト注入を実行し、`ObservationResult`(合格/反例)を集める。全タスクの結果を `観測結果確定` に相当する `VerificationRunSummary` に集約する
- **統合テスト**: `sugoroku.ashura` を実際にパースし、その AST(性質4件・依存2件)から検証タスクを列挙 → フィクスチャの観測結果(合格/反例混在パターン)を注入 → 集約結果を確認する一気通貫のテストを書く(Phase 1 で乖離ライフサイクル配線の欠落を防げなかった反省から、集約までを必ずテストする)

### 受け入れ条件

- `packages/ashura-surveyor` が pnpm workspace 配下で build/test 通る
- 検証タスク列挙が `sugoroku.ashura` の性質4件・依存2件を過不足なく列挙することをテストで確認する
- 観測結果集約が合格/反例混在パターンで正しい `VerificationRunSummary`(全合格 / 反例あり)を返すことをテストで確認する
- 一気通貫の統合テスト(パース→列挙→観測→集約)が green

### 完了条件

- `pnpm -F ashura-surveyor build`
- `pnpm -F ashura-surveyor test`

## Phase 3 - Implementation Plan (生成系: ジェネレーター+ファシリテーター)

### プロジェクト概要

`packages/ashura-surveyor` に、`domain/ashura.model.md` 文脈「生成」のフロー「コード生成」と文脈「モデル編集」のフロー「ファシリテーション」の決定的な骨格を実装する。ROADMAP.md の Phase 3 の3項目に対応する。

### スコープ決定

Phase 1・2 で確立した「非決定的要素(LLM)はインターフェースの裏に隔離し、決定的コアを実装する」パターンをそのまま踏襲する。ユーザーには Phase 1 で一度確認済みであり、Phase 2 でも同型の判断を踏襲したため、Phase 3 でも同じ前提で進める(改めて確認は取らない)。3本柱に分解すると、実際に非決定的(LLM)なのは「コード実体の生成」と「対話そのもの」のみで、残りは決定的コアとして実装できる:

- **柱1(生成ゲート+トレース表完全性)**: 決定的。前提チェック(`モデル成果物.状態 == 承認済み`)とトレース表完全性検査(Phase 1 の `trace-table.ts` を再利用)。LLM境界はコード実体の生成のみ、`CodeEmitter` インターフェースの裏に隔離しフィクスチャで代替する
- **柱2(冪等性)**: 完全に決定的。「バイト同一ではなく検証結果等価」を検証するには Phase 2 の `runVerification` がそのまま使える。2回の生成(コードバイトは異なる想定のフィクスチャ)をそれぞれ検証し、結果集合が一致することを確認する
- **柱3(ファシリテーター)**: 決定的な下地(草稿モデルの構造的欠落を機械的に検出し質問アジェンダを作る)+ 対話そのもの(LLM、Phase 3 では実装しない)。決定的な下地は「禁止遷移が0件の集約」の検出のみに絞る(「失敗系・境界規則」は自由文字列からの検出になり誤検知リスクが高いため、Phase 3 のスコープ外とし ROADMAP に明記する)

**モデル成果物ステータスの最小表現**: 生成ゲートには「承認済みかどうか」の判定が要る。`文脈 モデル編集` の集約「モデル成果物」(状態: 草稿→検査通過→レビュー中→承認済み、遷移条件つき)をフルに実装するのは投機的抽象化になるため、Phase 3 では状態の列挙型(`ModelStatus`)とゲート判定のみを実装し、遷移ロジックを持つ集約そのものは作らない

**トレース表完全性の抜け穴に対する対策**: `CodeEmitter` が返す `TraceTable` は「言及した宣言」のみを含みうるため、`findUntracedDeclarations` だけでは宣言の丸ごとの欠落(entryそのものが無い)を検出できない。モデルの全宣言(遷移・不変条件・性質・失敗セマンティクス)を独立に列挙する `enumerateModelDeclarations`(`ast.Model` のみを入力とする)を実装し、emitter の出力と突き合わせて欠落宣言を空 `codeLocations` として補完してから完全性検査にかける

### 操作仕様

- **柱1**: `model-status.ts`(`ModelStatus` 型)、`model-declarations.ts`(`enumerateModelDeclarations`: 遷移・不変条件・性質・失敗セマンティクスを `DeclarationId` として列挙)、`generation.ts`(`CodeEmitter` インターフェース、`generate(model, status, emitter): GenerationResult`。未承認なら `生成失敗`、トレース表が不完全(宣言の欠落を含む)なら `生成失敗`、両方満たせば `生成完了(コード, トレース表)`)
- **柱2**: `idempotency.ts`(`checkIdempotency`: 2つの検証タスク実行結果〈`CounterexampleSearch` 2系統〉を `runVerification` に通し、結果集合が一致するかを比較する `IdempotencyCheckResult`)
- **柱3**: `facilitator.ts`(`analyzeGaps(model): readonly FacilitationQuestion[]`。禁止遷移が0件の集約を検出し質問を生成する)
- 統合テスト: `sugoroku.ashura` を実パースし、(a) 完全なトレース表を返すフィクスチャemitterで `生成完了` になること、(b) 宣言が1件欠けたフィクスチャemitterで `生成失敗`(トレース表不完全)になること、(c) 未承認ステータスで `生成失敗`(モデル未承認)になることを確認する

### 受け入れ条件

- `packages/ashura-surveyor` が pnpm workspace 配下で build/test 通る
- 生成ゲートが未承認モデルを拒否すること(ゲート不可迂回性のテスト)
- トレース表の宣言欠落(entryごと無い場合を含む)が `生成失敗` として検出されること(黙って落とさない)
- 冪等性検証が「コードバイトは異なるが検証結果は一致」のフィクスチャで `equivalent: true`、結果が食い違うフィクスチャで `equivalent: false` を返すこと
- ファシリテーター欠落分析が禁止遷移のない集約を検出すること

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

## Phase 4 - Implementation Plan (方言機構)

### プロジェクト概要

`packages/ashura-dialect-ui` に、ADR-0002(方言は継承ではなく脱糖で拡張する)の最小実証を実装する。ROADMAP.md の Phase 4 の4項目に対応するが、フルスケールでの実装は行わない(下記スコープ決定)。

### スコープ決定

- **最小構成 = 糖衣構文1つ**: `ashura-dialect-ui` の README が挙げる三点セット(トークン/合成規則/trait + 3種のLSP検査 + 3種の検証アダプタ)を丸ごと実装するのは、Phase 0 で「examples 4題を一気に `.ashura` 化しない」と決めたのと同じ罠(一気に広げて何も実証しない)。`trait`(CLAUDE.md 記載の「状態機械の重複は trait〈基底状態機械の取り込み〉で解決」)1つに絞り、アーキテクチャ全体(構文糖衣→脱糖→コア語彙→既存サーベイヤー)を実証することを優先する
- **核心は「サーベイヤーは脱糖後のコア語彙のみを見る」(ROADMAP Phase4 の4項目目)**: 脱糖だけを単体テストして終わりにすると Phase 1 の乖離ライフサイクル配線漏れと同じ「テストは緑だが半分のパイプライン」になる。方言ソース→脱糖→コア `ast.Model` →**Phase 1-3 で実装済みの既存サーベイヤー関数(`enumerateModelDeclarations`/`enumerateVerificationTasks`/`analyzeGaps`)がコード変更なしでそのまま動く**ことを一気通貫でテストする。これが受け入れ条件の中核
- **脱糖の出力形式**: 方言ASTからコアの `.ashura` テキストを生成し、`ashura-core` の `createAshuraServices`/`parseHelper` で再パースして本物の `ast.Model` を得る(コアASTノードを直接構築する方式は `$container`/参照解決が壊れやすく採用しない)
- **コア文法不可侵(ADR-0002 / CLAUDE.md 絶対規則)**: `packages/ashura-core/src/language/ashura.langium` には一切手を入れない。方言は独立した Langium プロジェクト(独自の文法)として実装する。もし方言を通すためにコア文法を編集したくなったら、それは継承の道であり ADR-0002 が拒否した経路なので即座に止まる
- **方言の憲法(ROADMAP Phase4 の2項目目)はコードではない**: `domain/ashura.model.md` はモデル権威(仕様の真実はモデルのみが持つ)の対象そのもの。人間ゲート・自己適用性の原則により、この追記は Phase 1-3 の実装コミットと同列に扱わず、**草稿としてユーザーに提示し明示的な承認を得てから**別コミットにする(通常の実装コミットのように push まで自動で進めない)
- **プラグイン仕様(1項目目)・検証アダプタ**: 三点セットを表す TypeScript インターフェースとして定義する。追加LSP検査は代表1つ(またはインターフェースのみ)。検証アダプタ(視覚回帰・axe系a11y監査などの外部ツール実行)は非決定的要素なので、Phase 1-3 の `InferenceSource`/`CounterexampleSearch` と同型のフィクスチャシームで隔離する(実ツール連携は将来フェーズ送り)

### 操作仕様

- `packages/ashura-dialect-ui` に独立した Langium プロジェクトを立てる(`ashura-core` と同様の tsconfig/vitest 構成、`ashura-core` への依存を追加して脱糖後の再パースに使う)
- 最小文法: `trait`(名前付き状態機械テンプレート: 状態・遷移・禁止のみ)と、`集約` の trait 取り込み構文(`uses <trait名>` 相当)
- 脱糖: 方言ASTを受け取り、trait の状態・遷移・禁止を取り込み先の集約定義に展開したコアの `.ashura` テキストを生成する関数。生成したテキストを `ashura-core` で再パースし `ast.Model` を返す
- プラグインインターフェース: `{ parse, desugar }` + 追加LSP検査(代表1つ) + `VerificationAdapter`(検証アダプタ、フィクスチャシーム)
- 統合テスト: trait を使った方言ソース→脱糖→コア `ast.Model` に対して、既存の `enumerateModelDeclarations`・`analyzeGaps` 等を変更なしで呼び出し、trait 側で定義した禁止遷移がちゃんと合流していること(=`analyzeGaps` が質問を出さないこと)を確認する

### 受け入れ条件

- `packages/ashura-dialect-ui` が pnpm workspace 配下で build/test 通る
- trait を含む方言ソースが脱糖され、意味的に等価な手書きコア `.ashura` をパースした場合と同じ `ast.Model` 相当の情報(状態・遷移・禁止)を持つことをテストで確認する
- 脱糖後の `ast.Model` に対して Phase 1-3 の既存サーベイヤー関数がコード変更なしで正しく動作する(測量器は一つ、の実証)
- `ashura-core/src/language/ashura.langium` への変更がないこと(git diff で確認)

### 完了条件

- `pnpm -F ashura-dialect-ui build`
- `pnpm -F ashura-dialect-ui test`
- 方言の憲法草稿(`domain/ashura.model.md` への追記案)はユーザー提示・承認待ちの別コミットとして扱い、この完了条件には含めない

### メモ・決定事項(Phase 4)

- code-reviewで判明: 脱糖時に guard.kind が「契機」の場合、対応するイベント宣言(フロー)がないとコアの `checkTriggerReferencesExistingEvent` がエラーを出す。guard.kind を「条件」に読み替えて検査を回避するのは意味論を歪める誤魔化しなので不採用。代わりに `desugarTriggerFlow` で契機ごとに最小のコマンド+イベント宣言を持つフローを生成し、コアの意味論検査が実際に通る完全な脱糖にした
- code-reviewで判明: `assertNoParseErrors` が lexer/parser エラーのみを見て `document.diagnostics`(バリデーション診断)を無視していたため、上記の契機/イベント不整合が握りつぶされ「テストは緑だが半分のパイプライン」になっていた。severity=Error の診断のみを失敗条件に含めるよう修正(warningは許容: 方言側の変数なし警告・脱糖後コアの語彙警告は正当な最小構成でも出うるため)
- 未対応(スコープ外、将来メモ): `DialectPlugin.parse`/`desugar` は呼び出しのたびに Langium サービス一式を再生成している。テストでの隔離目的の再生成とは異なり、本番のLSP経由での繰り返し呼び出しでは応答遅延の要因になりうる(code-review指摘、PLAUSIBLE)。最小構成では対応せず、実LSP統合のフェーズでキャッシュ方針を検討する

## Phase 5 - Implementation Plan (ブートストラップ)

### プロジェクト概要

ROADMAP.md の Phase 5 の2項目(自己モデルの `.ashura` 化・環境自身の開発プロセスのライフサイクル適用)を実装する。この環境自身のモデル(`domain/ashura.model.md`)を、Phase 0-4 で作ったコアDSL・サーベイヤーの実測対象に乗せることで、性質「自己適用性」を実証する。

### スコープ決定(ユーザー承認済み)

- **項目1(自己モデルの.ashura化)**: `文脈 X { 集約... フロー... }` というMarkdown側のネスト構造は、コアDSL文法(`Model: (elements+=ModelElement)*` がフラットな列であることに起因し表現できない。Phase 0 の B-3(すごろく翻訳)と同じ方針で「原文の暗黙の対応を明示化する」翻訳を行う: `契機` ガードの参照先イベントが存在しない箇所(例: `モデル成果物` の `LSP全検査パス`・`レビュー依頼`・`人間の承認`・`差し戻し`、`乖離` の `人間裁定`)に対し、対応するコマンド→イベント宣言を持つフローを追加した。フロー内にしか書けない「前提」「トレース表の完全性」は `検査`(StaticCheckDecl)へ、「冪等性」「独立導出」は文脈ごとの `性質` ブロックへ再配置した
- **`domain/ashura.model.md` の廃止**: ユーザーに「共存させる(Markdownは解説用に残す)」か「Markdownを廃止し.ashuraのみにする」かを確認し、後者を選択。二重管理(同期コスト)を避けるため .ashura を唯一の権威とし、CLAUDE.md・README.md・ashura-surveyorのソースコメント中の参照をすべて更新した
- **項目2(開発プロセスのライフサイクル適用)**: 「モデルの承認を自動化するコードを書かない」(人間ゲート原則)と両立させるため、承認そのものは自動化せず、Phase 4 の `ashura-dialect-ui/test/surveyor-integration.test.ts` と同型の一気通貫テストとして実装した。既存のサーベイヤー関数(`enumerateModelDeclarations`・`analyzeGaps`・`generate`)を自己モデルの実ASTにコード変更なしで適用し、「承認済みになった後」のゲート・トレース表完全性・欠落分析が機能することを検証する。これにより「測量器は一つ、自己モデルも特別扱いしない」ことを実証する

### 操作仕様

- `domain/ashura.model.ashura` を新規作成(用語集1・集約2・フロー5・決定表1・性質3ブロック・依存1ブロックの14トップレベル要素)
- `packages/ashura-core/test/self-model.test.ts`: 自己モデルのパース+診断ゼロ(要素14件)を検証
- `packages/ashura-surveyor/test/support/parse-self-model.ts`: `parseSugoroku` と同型の自己モデル読み込みヘルパー
- `packages/ashura-surveyor/test/self-model-bootstrap.test.ts`: `enumerateModelDeclarations`(遷移7・不変条件3・性質6・依存4)・`analyzeGaps`(2集約とも質問0件)・`generate`(未承認3ステータスで生成失敗、承認済み+完全トレース表で生成完了、宣言欠落で生成失敗)を自己モデルに対して検証

### 受け入れ条件

- `pnpm -F ashura-core test` / `pnpm -F ashura-surveyor test` が green
- 自己モデルの実ASTに対し、Phase 1-3 の既存サーベイヤー関数がコード変更なしで正しく動作する
- `domain/ashura.model.md` への参照が(歴史的記録であるPLAN.md/ROADMAP.mdの完了済み項目を除き)残っていない

### 完了条件

- `pnpm -F ashura-core test`
- `pnpm -F ashura-surveyor test`
- `domain/ashura.model.md` 削除、`domain/ashura.model.ashura` 追加(コミット済み)

---

## 完了済みフェーズ

- Phase A: workspace + Langium scaffold `78d2f86..78d2f86`
- Phase B: コア文法とサンプル `92d92a4..c28056c`
- Phase C: LSP検査3種 `d13e439..49f0f5b`
