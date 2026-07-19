grammar Ashura

entry Model:
    (elements+=ModelElement)*;

ModelElement:
    Placeholder | StateKeywordSpike;

Placeholder:
    'placeholder' name=ID;

StateKeywordSpike:
    '状態' name=ID;

terminal ID: /[_a-zA-Z぀-ヿ一-鿿][\w぀-ヿ一-鿿]*/;

hidden terminal WS: /\s+/;
hidden terminal COMMENT: /#[^\n\r]*/;
