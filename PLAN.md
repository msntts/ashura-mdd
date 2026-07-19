# Ashura MDD Phase 0 - Implementation Plan

## プロジェクト概要

Langium ベースのコアDSL(`.ashura`)を `packages/ashura-core` に立て、`examples/sugoroku-model.md` を翻訳した正典サンプルに対して LSP検査3種(語彙整合・状態機械網羅性・フロー⇄集約参照整合)を実装する。ROADMAP.md の Phase 0 残タスクに対応。

## 環境

- Windows / Node.js / TypeScript / pnpm(ワークスペース化する)
- Langium(DSL+LSP、Chevrotainベース)
- vitest(パーサ・validatorのテスト)

## 操作仕様

- `packages/ashura-core` に Langium プロジェクトを立てる(ルートを pnpm workspace化)
- 日本語識別子(用語集エントリ名・状態名など)をトークナイズできる ID 終端に置き換える(Unicode範囲、平仮名・片仮名・漢字)
- コア文法は **LSP検査3種から逆算した範囲のみ厳密化**する:
  - 厳密に構文化: コンテキストマップ / 用語集(用語+種別) / 集約(状態列挙・遷移・禁止・変数宣言の変数名のみ) / フロー(コマンド・イベント名・ポリシーのトリガー) / 決定表(ヘッダ+行) の**構造**
  - 自由文字列/緩い参照拾いで良い: 不変条件式・ガード条件(`条件:`)の中身・性質の本文・決定表内の検査文
- Markdown のパイプ表(`|...|`)や `# ===` バナーはそのまま文法化しない。Langiumに自然な行構文へ**翻訳**する(逐語パースではない)
- `examples/sugoroku-model.md` を `packages/ashura-core/examples/sugoroku.ashura` として翻訳する。**正典サンプルは内部整合させる**(集約の遷移 `進行中 -> 終了 [契機: ゴール到達]` に対応するイベントをフロー側に追加するなど、原文の暗黙の対応を明示化する)
- 検査3種それぞれについて、正しく倒れる**負のフィクスチャ**(未定義遷移・用語集にない名詞・存在しないイベント参照)を用意し、期待通りに diagnostics が出ることを確認する

## 受け入れ条件

- `packages/ashura-core` が pnpm workspace 配下で build/test 通る
- 正典 `sugoroku.ashura` がエラーなくパースされ、かつ検査3種すべてで診断ゼロ
- 検査3種それぞれに正常系(検出されない)・異常系(検出される)のテストが vitest で green

## 完了条件

- `pnpm -F ashura-core build`
- `pnpm -F ashura-core test`

---

## 🔥 Hotfix(最優先)

<!-- 動作確認中の不具合・緊急対応はここに積む -->

---

## Phase A: workspace + Langium scaffold

- [x] A-1. ルートを pnpm workspace化し `packages/ashura-core` に Langium プロジェクトを立てる(空文法でbuild/test通過) → [詳細](docs/briefs/step-A-1-scaffold.md)

## Phase B: コア文法とサンプル

- [x] B-1. 日本語ID終端のトークナイズ検証(1行フィクスチャ)
- [x] B-2. コア文法定義(コンテキストマップ/用語集/集約/フロー/決定表/性質/依存) → [詳細](docs/briefs/step-B-2-grammar.md)
- [ ] B-3. `sugoroku.ashura` 作成とパース確認(正典サンプルとして内部整合) → [詳細](docs/briefs/step-B-3-sugoroku.md)

## Phase C: LSP検査3種 [REVIEW]

- [ ] C-1. 語彙整合検査(用語集にない名詞参照を警告)+ 正常/異常フィクスチャ + テスト → [詳細](docs/briefs/step-C-1-vocabulary.md)
- [ ] C-2. 状態機械網羅性検査(未定義遷移・到達不能状態)+ フィクスチャ + テスト → [詳細](docs/briefs/step-C-2-statemachine.md)
- [ ] C-3. フロー⇄集約参照整合検査(存在しないイベントへの契機参照をエラー)+ フィクスチャ + テスト → [詳細](docs/briefs/step-C-3-reference.md)

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

## 完了済みフェーズ

<!-- Phase {N}: {フェーズ名} `{開始ハッシュ}..{終了ハッシュ}` -->
