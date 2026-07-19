# Step A-1: workspace + Langium scaffold

## 前提条件

- ルートに `package.json` / `pnpm-workspace.yaml` は存在しない
- `packages/ashura-core/README.md` のみ存在する(コード・設定ファイルなし)

## 制約(触らないもの)

- `packages/ashura-dialect-ui`・`packages/ashura-dialect-game` は今回触らない(READMEのみのまま)
- 文法定義の中身(トークン・ルール)はこのステップでは空/最小のプレースホルダで良い。文法設計は B-2 で行う

## 手順

1. リポジトリルートに `pnpm-workspace.yaml` を作成する:

   ```yaml
   packages:
     - 'packages/*'
   ```

2. リポジトリルートに `package.json` を作成する(private: true、workspace root)。

   ```json
   {
     "name": "ashura-mdd",
     "private": true,
     "packageManager": "pnpm@<現在のpnpmバージョン>"
   }
   ```

   `pnpm --version` で現在のバージョンを確認して埋める。

3. `packages/ashura-core/package.json` を作成する。依存関係:
   - dependencies: `langium`
   - devDependencies: `langium-cli`, `typescript`, `vitest`
   - scripts: `"langium:generate": "langium generate"`, `"build": "tsc -b"`, `"test": "vitest run"`
     バージョンは執筆時点の最新安定版を使う(`pnpm add` で解決させてよい)。

4. `packages/ashura-core/tsconfig.json` を作成する(target: ES2022程度、module: NodeNext、outDir: `out`、rootDir: `src`、strict: true)。

5. `packages/ashura-core/langium-config.json` を作成する。言語IDは `ashura`、拡張子は `.ashura`、grammar は `src/language/ashura.langium`、出力先は `src/language/generated`。

6. `packages/ashura-core/src/language/ashura.langium` に最小の文法を書く(空でもパースが通る最小構成):

   ```langium
   grammar Ashura

   entry Model:
       (elements+=ModelElement)*;

   ModelElement:
       {infer Placeholder} name=ID;

   terminal ID: /[_a-zA-Z][\w_]*/;
   hidden terminal WS: /\s+/;
   hidden terminal COMMENT: /#[^\n\r]*/;
   ```

   (B-2 で本文法に置き換える前提の仮実装)

7. `pnpm install` をルートで実行し、ワークスペースとして依存関係が解決されることを確認する。

8. `packages/ashura-core` で `pnpm langium:generate` を実行し、`src/language/generated/` が生成されることを確認する。

9. `packages/ashura-core/src/index.ts` に生成された `ashuraServices` / `createAshuraServices` を re-export する最小のエントリポイントを書く。

10. `packages/ashura-core/test/parsing.test.ts` に「空文字列がパースできる(diagnosticsゼロ)」ことだけを確認する最小の vitest テストを書く。

## 完了確認

- `pnpm -F ashura-core build` が成功する
- `pnpm -F ashura-core test` が成功する(1件のプレースホルダテストがpass)
- `git status` でルートの `package.json` / `pnpm-workspace.yaml` / `packages/ashura-core/*` が新規追加されている
