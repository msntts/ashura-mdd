# Step B-2: コア文法定義

## 前提条件

- A-1 完了(Langium scaffold で build/test が通る)
- B-1 完了(日本語ID終端がトークナイズできることを確認済み。その終端定義をここで使う)

## 制約(触らないもの)

- 不変条件式(`全て(p in …): …` 等)・ガード条件(`条件: …`)の中身・性質の本文は**厳密な式文法にしない**。自由文字列として1トークン/1行で受ける
- Markdown のパイプ表(`|...|`)や `# ===` バナーはそのまま文法に持ち込まない。決定表は Langium 側で自然な行構文として再設計する(下記参照)
- 方言拡張(トークン合成規則・trait)はここでは実装しない(Phase 4)

## 手順

1. `packages/ashura-core/src/language/ashura.langium` を以下の構成で書き直す。B-1 で確認した ID 終端をそのまま使う。

   ```langium
   grammar Ashura

   entry Model:
       (elements+=ModelElement)*;

   ModelElement:
       ContextMap | Glossary | Aggregate | Flow | DecisionTable | PropertyBlock | DependencyBlock;

   // --- コンテキストマップ ---
   ContextMap:
       'コンテキストマップ' '{'
           contexts+=ContextDecl*
           relations+=RelationDecl*
           (crossCutting=CrossCuttingBlock)?
       '}';

   ContextDecl:
       '文脈' name=ID (description=STRING)?;

   RelationDecl:
       '関係' from=[ContextDecl:ID] '->' to=[ContextDecl:ID] (note=STRING)?;

   CrossCuttingBlock:
       '横断制約' '{'
           items+=FreeLine*
       '}';

   // --- 用語集 ---
   Glossary:
       '用語集' name=ID '{'
           terms+=GlossaryTerm*
       '}';

   GlossaryTerm:
       name=ID ':' kind=ID (description=STRING)? (rest=FREE_TEXT)?;

   // --- 集約(状態機械+変数+不変条件) ---
   Aggregate:
       '文脈'? // 実サンプルでは 文脈 ブロックの中に集約がネストする。ネスト対応は下記10を参照
       '集約' name=ID '{'
           (stateDecl=StateDeclaration)?
           (members+=AggregateMember)*
       '}';

   AggregateMember:
       Transition | Forbidden | VariableBlock | InvariantBlock;

   StateDeclaration:
       '状態' ':' states+=StateRef ('->' states+=StateRef)*;

   StateRef:
       name=ID;

   Transition:
       '遷移' from=[StateRef:ID] '->' to=[StateRef:ID] '[' guard=GuardSpec ']';

   GuardSpec:
       kind=('条件' | '契機') ':' text=BRACKET_TEXT;

   Forbidden:
       '禁止' from=[StateRef:ID] '->' to=[StateRef:ID] (note=FREE_TEXT)?;

   VariableBlock:
       '変数' '{'
           entries+=VariableEntry*
       '}';

   VariableEntry:
       name=ID ':' type=FREE_TEXT;

   InvariantBlock:
       '不変条件' '{'
           entries+=FreeLine*
       '}';

   // --- フロー ---
   Flow:
       'フロー' name=ID '{'
           statements+=FlowStatement*
       '}';

   FlowStatement:
       CommandDecl | PolicyDecl | ChainLimitDecl | StaticCheckDecl;

   CommandDecl:
       'コマンド' name=ID (actor=STRING)?
           ('->' 'イベント' event=EventDecl)?;

   EventDecl:
       name=ID ('(' params+=ID (',' params+=ID)* ')')?;

   PolicyDecl:
       'ポリシー' ':' trigger=[EventDecl:ID] steps+=PolicyStep+;

   PolicyStep:
       '->' (('イベント' event=EventDecl) | ('コマンド' command=ID (FREE_TEXT)?) | ('決定表' table=[DecisionTable:ID] FREE_TEXT?));

   ChainLimitDecl:
       '連鎖上限' ':' value=NUMBER;

   StaticCheckDecl:
       '検査' ':' text=FREE_TEXT;

   // --- 決定表 ---
   // Markdownのパイプ表はそのまま持ち込まず、行指向の構文に翻訳する:
   //   決定表 マス効果 {
   //     入力: 到着マス番号
   //     出力: アクション
   //     行 "5" -> "移動(-3)" ("3マス戻る")
   //     ...
   //   }
   DecisionTable:
       '決定表' name=ID '{'
           '入力' ':' input=FREE_TEXT
           '出力' ':' output=FREE_TEXT
           rows+=DecisionRow*
           checks+=StaticCheckDecl*
       '}';

   DecisionRow:
       '行' condition=STRING '->' action=STRING (note=STRING)?;

   // --- 性質 ---
   PropertyBlock:
       '性質' '{'
           properties+=PropertyEntry*
       '}';

   PropertyEntry:
       name=ID ':' body=FREE_TEXT;

   // --- 依存 ---
   DependencyBlock:
       '依存' '{'
           entries+=DependencyEntry*
       '}';

   DependencyEntry:
       name=ID '(' spec=FREE_TEXT ')';

   // --- 終端 ---
   terminal ID: /[_a-zA-Z぀-ヿ一-鿿][\w぀-ヿ一-鿿]*/;
   terminal STRING: /"[^"]*"|'[^']*'/;
   terminal NUMBER returns number: /-?[0-9]+/;
   terminal FREE_TEXT: /[^\n\r{}]+/;
   terminal BRACKET_TEXT: /[^\]\n\r]+/;
   FreeLine returns string: FREE_TEXT;

   hidden terminal WS: /\s+/;
   hidden terminal COMMENT: /#[^\n\r]*/;
   ```

2. 上記はドラフト。実装時に Langium の制約(左再帰不可・terminal優先順位・keywordとIDの衝突)に当たったら、**検査3種が必要とする構造(用語集エントリ名/状態名と遷移/イベント名とポリシートリガー)は崩さずに**、自由文字列部分の切り方だけを調整してよい。これは設計変更ではなく実装上の微調整として扱う。

3. `文脈 モデル編集 { 集約 モデル成果物 { ... } フロー ファシリテーション { ... } }` のように、実サンプル(`domain/ashura.model.md`)では `文脈` ブロックの中に `集約`/`フロー` がネストしている。`ContextDecl` を拡張し、`文脈` ブロックが直接 `{ }` を持って中に `ModelElement` を含められるようにする(`ContextDecl` を `文脈` 単体宣言と `文脈 X { ... }` ネストブロックの2形態に対応させる)。ただし B-3 で使う `sugoroku.ashura` はネストしないフラットな構造(用語集/集約/フロー/決定表/性質/依存を並列に置く)なので、**ネスト対応はB-2では見送ってよい**。`sugoroku.ashura` が要求する範囲(フラット構造)だけを文法化すれば B-3・C-1〜C-3 は成立する。ネストは Phase 1 以降で `domain/ashura.model.md` 自体を `.ashura` 化するとき(Phase 5 ブートストラップ)に拡張する、と `メモ・決定事項` に記録する。

4. `pnpm langium:generate` → `pnpm -F ashura-core build` が通ることを確認する。

5. `test/parsing.test.ts` に、`examples/sugoroku-model.md` 由来ではない**最小の自作フィクスチャ**(用語集1つ+集約1つ+フロー1つ)をパースしてdiagnosticsゼロになることを確認するテストを追加する(sugoroku全体の検証はB-3で行う)。

## 完了確認

- `pnpm -F ashura-core build` が成功する
- `pnpm -F ashura-core test` が成功する
- 最小フィクスチャが用語集/集約(状態・遷移・禁止・変数・不変条件)/フロー(コマンド・イベント・ポリシー)/決定表/性質/依存の全セクションを1回ずつ含み、エラーなくパースされる
