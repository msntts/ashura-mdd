grammar Ashura

entry Model:
    (elements+=ModelElement)*;

ModelElement:
    Placeholder;

Placeholder:
    'placeholder' name=ID;

terminal ID: /[_a-zA-Z][\w_]*/;

hidden terminal WS: /\s+/;
hidden terminal COMMENT: /#[^\n\r]*/;
