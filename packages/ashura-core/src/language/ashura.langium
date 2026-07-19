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
        items+=CrossCuttingItem*
    '}';

CrossCuttingItem:
    name=ID ':' body=STRING;

// --- 用語集 ---
Glossary:
    '用語集' name=ID '{'
        terms+=GlossaryTerm*
    '}';

GlossaryTerm:
    name=ID ':' kind=ID (rest=STRING)?;

// --- 集約(状態機械+変数+不変条件) ---
// State は StateDeclaration という別ノードで包まず Aggregate 直下のプロパティとして持つ。
// Langiumのデフォルトscopingはノードの「直接の親コンテナ」単位で名前解決するため、
// Transition/Forbidden の cross-reference が State を見つけられるようにするための構造。
Aggregate:
    '集約' name=ID '{'
        ('状態' ':' states+=State ('->' states+=State)*)?
        (members+=AggregateMember)*
    '}';

State:
    name=ID;

AggregateMember:
    Transition | Forbidden | VariableBlock | InvariantBlock;

Transition:
    '遷移' from=[State:ID] '->' to=[State:ID] '[' guard=GuardSpec ']';

// text は自由文字列(GuardSpecの本文)。裸のFREE_TEXT終端はChevrotainのlongest-match戦略下で
// キーワード終端と全域で競合し誤トークナイズを起こすため、必ず引用符付きSTRINGにする。
GuardSpec:
    kind=('条件' | '契機') ':' text=STRING;

Forbidden:
    '禁止' from=[State:ID] '->' to=[State:ID];

VariableBlock:
    '変数' '{'
        entries+=VariableEntry*
    '}';

VariableEntry:
    name=ID ':' type=STRING;

InvariantBlock:
    '不変条件' '{'
        entries+=InvariantEntry*
    '}';

InvariantEntry:
    text=STRING;

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

// トリガー名は形式的なcross-referenceにしない(EventDeclはCommandDecl/PolicyStepの
// 内側にネストしており、Flow直下のデフォルトscopeからは届かない)。プレーンなID一致として
// 手動検証(必要であれば)する方針。
PolicyDecl:
    'ポリシー' ':' trigger=ID 'のとき' steps+=PolicyStep+;

PolicyStep:
    '->' (('イベント' event=EventDecl) | ('コマンド' command=ID (note=STRING)?) | ('決定表' table=[DecisionTable:ID] (note=STRING)?));

ChainLimitDecl:
    '連鎖上限' ':' value=NUMBER;

StaticCheckDecl:
    '検査' ':' text=STRING;

// --- 決定表 ---
// Markdownのパイプ表はそのまま持ち込まず、行指向の構文に翻訳する。
DecisionTable:
    '決定表' name=ID '{'
        '入力' ':' input=STRING
        '出力' ':' output=STRING
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
    name=ID ':' body=STRING;

// --- 依存(文脈間) ---
DependencyBlock:
    '文脈間' '{'
        entries+=DependencyEntry*
    '}';

DependencyEntry:
    '依存' name=ID '(' spec=STRING ')';

// --- 終端 ---
terminal ID: /[_a-zA-Z぀-ヿ一-鿿][\w぀-ヿ一-鿿]*/;
terminal STRING: /"[^"]*"|'[^']*'/;
terminal NUMBER returns number: /-?[0-9]+/;

hidden terminal WS: /\s+/;
hidden terminal COMMENT: /#[^\n\r]*/;
