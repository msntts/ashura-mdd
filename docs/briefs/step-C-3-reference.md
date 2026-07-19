# Step C-3: フロー⇄集約参照整合検査

## 前提条件

- B-3 完了(`sugoroku.ashura` は `契機` がすべてフロー内の実在イベント名を参照するよう内部整合済み)
- C-1, C-2 完了(validator/フィクスチャ/テストの型ができている)

## 制約(触らないもの)

- `GuardSpec.text` はB-2の設計どおり自由文字列(`BRACKET_TEXT`)のまま。Langiumの形式的cross-referenceには変更しない(`条件:` と `契機:` の両方が同じフィールドを使う設計を崩さない)。参照整合はこのステップで**手動のドキュメント解析**として実装する

## 検査の定義

`Transition.guard.kind === '契機'` の場合、`guard.text` の先頭トークン(空白・括弧までの部分)をイベント名とみなす。モデル全体の全 `Flow` 内の `EventDecl.name` を集めた集合にそのイベント名が含まれなければ、error「存在しないイベントへの契機参照です: X」を `Transition` ノード(の `guard` プロパティ)に出す。

## 手順

1. `ashura-validator.ts` に `checkTriggerReferencesExistingEvent(node: Transition, accept: ValidationAcceptor): void` を追加する。
   - `node.guard.kind !== '契機'` なら即return
   - ASTルート(`Model`)を辿り、全 `Flow.statements` から `CommandDecl.event` と `PolicyDecl.steps[].event` の `EventDecl.name` を収集する
   - `guard.text` からイベント名トークンを抽出する(例: `"ゴール到達"` → `ゴール到達`。パラメータ付きの場合 `"出目確定(出目)"` のような書き方は現状の `sugoroku.ashura` にはない想定なので、まず単純に先頭の空白区切りトークンを使う実装でよい)
   - 収集した名前集合に含まれなければ `accept('error', ..., { node, property: 'guard' })`

2. `ValidationRegistry` に `Transition: validator.checkTriggerReferencesExistingEvent` を登録する。

3. フィクスチャを追加する:
   - `packages/ashura-core/fixtures/invalid/reference-unknown-event.ashura`: `sugoroku.ashura` をコピーし、`遷移 進行中 -> 終了 [契機: ゴール到達]` の `契機` を存在しないイベント名(例: `[契機: 存在しないイベント]`)に変更する

4. `packages/ashura-core/test/reference.test.ts` を新規作成する:
   - 正常系: `sugoroku.ashura` で該当errorが0件(B-3で整合済みのため)
   - 異常系: 上記フィクスチャで期待するerrorが1件出ることを確認

## 完了確認

- `pnpm -F ashura-core test` で `reference.test.ts` が green
- 全フィクスチャ・全テストを合わせて `pnpm -F ashura-core test` がPhase 0の受け入れ条件(正典サンプルのdiagnosticsゼロ+検査3種それぞれ正常系/異常系)を満たしている
