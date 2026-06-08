import React from 'react';
export declare function JsonHighlight({ code }: {
    code: string;
}): React.JSX.Element;
export declare function LuceneHighlight({ code }: {
    code: string;
}): React.JSX.Element;
interface SyntaxHighlightProps {
    code: string;
    format: string;
}
export declare const SyntaxHighlight: React.FC<SyntaxHighlightProps>;
export {};
