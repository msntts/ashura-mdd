grammar AshuraUi

// Phase 4 最小構成: trait(基底状態機械の取り込み)構文糖衣のみを実装する。
// トークン/合成規則/追加のtraitバリエーションは対象外(PLAN.md参照)。
// この文法はコア(ashura-core/src/language/ashura.langium)から完全に独立している
// (ADR-0002: 方言は継承ではなく脱糖で拡張する。コア文法には一切手を入れない)。

entry Model:
    (elements+=UiElement)*;

UiElement:
    Trait | Component;

// --- trait: 名前付き状態機械テンプレート(基底状態機械の取り込み) ---
Trait:
    'trait' name=ID '{'
        '状態' ':' states+=UiState ('->' states+=UiState)*
        (members+=TraitMember)*
    '}';

UiState:
    name=ID;

TraitMember:
    UiTransition | UiForbidden;

UiTransition:
    '遷移' from=[UiState:ID] '->' to=[UiState:ID] '[' guard=UiGuardSpec ']';

UiGuardSpec:
    kind=('条件' | '契機') ':' text=STRING;

UiForbidden:
    '禁止' from=[UiState:ID] '->' to=[UiState:ID];

// --- component: 脱糖でコアの集約に変換される。状態機械は trait から取り込む ---
Component:
    '集約' name=ID 'uses' trait=[Trait:ID] '{'
        (variables=UiVariableBlock)?
    '}';

UiVariableBlock:
    '変数' '{'
        entries+=UiVariableEntry*
    '}';

UiVariableEntry:
    name=ID ':' type=STRING;

// --- 終端(コアと同じUnicode範囲の識別子。自由文字列は必ず引用符付きSTRING) ---
terminal ID: /[_a-zA-Z぀-ヿ一-鿿][\w぀-ヿ一-鿿]*/;
terminal STRING: /"[^"]*"|'[^']*'/;

hidden terminal WS: /\s+/;
hidden terminal COMMENT: /#[^\n\r]*/;
