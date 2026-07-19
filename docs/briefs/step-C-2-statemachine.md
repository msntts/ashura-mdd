# Step C-2: 状態機械網羅性検査

## 前提条件

- C-1 完了(validator の登録パターンが存在する。同じ `ashura-validator.ts` に追記する)

## 制約(触らないもの)

- 状態遷移の cross-reference(`Transition.from`/`to` が `状態:` 宣言にない名前を参照した場合)は文法レベルの linker エラーとして既に検出される(Langiumの標準リンカ挙動)。ここでは重複実装しない

## 検査の定義(スコープを決め打ちする)

`Aggregate` ごとに以下の2つを検査する:

1. **未定義遷移**: `状態: A -> B -> C` の宣言チェーンが暗示する隣接ペア(`A->B`, `B->C`)それぞれについて、対応する明示的な `遷移 A -> B [...]` 文が存在しない場合、error「状態宣言チェーンに対応する遷移が定義されていません: A -> B」を `StateDeclaration` ノードに出す
2. **到達不能状態**: `状態:` チェーンの先頭を初期状態とし、`遷移` で定義された辺(有向グラフ)を辿って到達可能な状態集合をBFS/DFSで求める。`状態:` に宣言されているが到達不能な状態があれば、warning「到達不能な状態です: X」をその `StateRef` に出す

## 手順

1. `ashura-validator.ts` に `checkStateMachineCoverage(node: Aggregate, accept: ValidationAcceptor): void` を追加する。
   - `node.stateDecl.states` からチェーンの隣接ペアを作る
   - `node.members` から `Transition` を集め、`(from.ref?.name, to.ref?.name)` のペア集合を作る
   - 未定義遷移チェック: チェーンの各ペアが遷移ペア集合に含まれるか確認
   - 到達不能チェック: 遷移ペアを隣接リストとしてグラフを構築し、チェーン先頭からBFS。`状態:` の全状態が到達集合に含まれるか確認

2. Langium の `ValidationRegistry` に `Aggregate: validator.checkStateMachineCoverage` を登録する。

3. フィクスチャを追加する:
   - `packages/ashura-core/fixtures/invalid/statemachine-undefined-transition.ashura`: `sugoroku.ashura` をコピーし、`状態:` チェーンに新しい状態を1つ追加する(例: `状態: 募集中 -> 進行中 -> 精算中 -> 終了`)が、対応する `遷移 進行中 -> 精算中` / `遷移 精算中 -> 終了` を書かない(未定義遷移を発生させる)
   - `packages/ashura-core/fixtures/invalid/statemachine-unreachable.ashura`: `sugoroku.ashura` をコピーし、`状態:` チェーンに孤立状態を追加する(例: `状態: 募集中 -> 進行中 -> 終了 -> アーカイブ済`)。チェーンには入れるが `遷移` は一切追加しない(未定義遷移と到達不能の両方が出る想定でも良いが、テストでは到達不能側のメッセージを確認する)

4. `packages/ashura-core/test/state-machine.test.ts` を新規作成する:
   - 正常系: `sugoroku.ashura` で該当エラー・警告が0件
   - 異常系: 上記2フィクスチャでそれぞれ期待する diagnostic が出ることを確認

## 完了確認

- `pnpm -F ashura-core test` で `state-machine.test.ts` が green
- `sugoroku.ashura` に対する diagnostics が引き続き0件(C-1のwarningも含めて)
