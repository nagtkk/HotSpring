export declare type Hash<T = any> = Record<PropertyKey, T>;
export declare type Supplier<T> = T | (() => T);
export declare type Consumer<T> = (x: T) => void;
export declare type Dependency = any[] | Hash;
export declare type VAttr = {
    style?: string | CSSStyleDeclaration;
    [p: string]: any;
};
export interface VArgArray extends Array<VArg> {
}
export declare type VArg = VArgArray | VNode | null | undefined | boolean | string | number | VAttr;
export declare type VNode = (target: Element) => void;
export declare type VComp<T extends Hash = {}> = (args: T, self: Element) => VArg;
export declare type Cleanup = void | (() => void);
export declare type Effect = () => Cleanup;
export declare type HTMLElementTagName = keyof HTMLElementTagNameMap;
declare const h: {
    (tag: "object" | "link" | "small" | "sub" | "sup" | "track" | "progress" | "a" | "abbr" | "address" | "applet" | "area" | "article" | "aside" | "audio" | "b" | "base" | "basefont" | "bdi" | "bdo" | "blockquote" | "body" | "br" | "button" | "canvas" | "caption" | "cite" | "code" | "col" | "colgroup" | "data" | "datalist" | "dd" | "del" | "details" | "dfn" | "dialog" | "dir" | "div" | "dl" | "dt" | "em" | "embed" | "fieldset" | "figcaption" | "figure" | "font" | "footer" | "form" | "frame" | "frameset" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "head" | "header" | "hgroup" | "hr" | "html" | "i" | "iframe" | "img" | "input" | "ins" | "kbd" | "label" | "legend" | "li" | "main" | "map" | "mark" | "marquee" | "menu" | "meta" | "meter" | "nav" | "noscript" | "ol" | "optgroup" | "option" | "output" | "p" | "param" | "picture" | "pre" | "q" | "rp" | "rt" | "ruby" | "s" | "samp" | "script" | "section" | "select" | "slot" | "source" | "span" | "strong" | "style" | "summary" | "table" | "tbody" | "td" | "template" | "textarea" | "tfoot" | "th" | "thead" | "time" | "title" | "tr" | "u" | "ul" | "var" | "video" | "wbr", ...args: VArg[]): VNode;
    <T extends Record<string | number | symbol, any>>(factory: VComp<T>, args: T): VNode;
    (factory: VComp<{}>): VNode;
} & {
    fold: {
        <S>(s: Supplier<S>): [S, Consumer<S>];
        <S_1>(s: Supplier<S_1>, r: (s: S_1) => S_1): [S_1, () => void];
        <S_2, A>(s: Supplier<S_2>, r: (s: S_2, a: A) => S_2): [S_2, Consumer<A>];
    };
    memo: <T_1>(factory: () => T_1, deps: Dependency) => T_1;
    post: (effect: Effect, deps?: Record<string | number | symbol, any> | any[] | undefined) => void;
    side: (effect: Effect, deps?: Record<string | number | symbol, any> | any[] | undefined) => void;
    pure: <T_2 extends Record<string | number | symbol, any>>(f: VComp<T_2>) => (props: T_2) => VNode;
    same: (a: any, b: any) => boolean;
};
export { h };
