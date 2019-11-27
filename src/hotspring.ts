export type Hash<T = any> = Record<PropertyKey, T>;
export type Supplier<T> = T | (() => T);
export type Consumer<T> = (x: T) => void;
export type Dependency = any[] | Hash;
type EventMap = Hash<Function>;
type VImpl = {
    _type: string | VComp<any>;
    _attrs: Hash;
    _items: Hash<VImpl>;
};
export type VAttr = {
    style?: string | CSSStyleDeclaration;
    [p: string]: any;
};
export interface VArgArray extends Array<VArg> { }
export type VArg = VArgArray | VNode | null | undefined | boolean | string | number | VAttr;
export type VNode = (target: Element) => void;
export type VComp<T extends Hash = {}> = (args: T, self: Element) => VArg;
export type Cleanup = void | (() => void);
export type Effect = () => Cleanup;
export type HTMLElementTagName = keyof HTMLElementTagNameMap;

const { is, assign, keys } = Object;
const doc = document;
const raf = requestAnimationFrame;
const invokeLater = setTimeout;

const isFunction = (x: any): x is Function => typeof x === 'function';
const isObject = (x: any): x is Hash => typeof x === 'object';
const isArray = Array.isArray;

const get = <T>(o: any, k: PropertyKey) => o[k] as T | undefined;
const set = <T>(o: any, k: PropertyKey, v: T) => o[k] = v;

const reportError = (error: any) => {
    console.error(error);
};

const safeCall = <T>(runnable: () => T): T | void => {
    try {
        return runnable();
    } catch (e) {
        reportError(e);
    }
};

const resume = (runnables: (() => void)[]) => {
    runnables.forEach(safeCall);
    runnables.length = 0;
};

const same = (a: any, b: any) => {
    if (a === b) {
        return true;
    }
    if (!isObject(a) || !isObject(b)) {
        return false;
    }
    if (isArray(a)) {
        return isArray(b) &&
            a.length === b.length &&
            a.every((v, i) => is(v, b[i]));
    }
    const keyList = keys(a);
    return keyList.length === keys(b).length &&
        keyList.every(k => b.hasOwnProperty(k) && is(a[k], b[k]));
};

const extension = <P extends object, V>() => {
    const symbol = Symbol();
    const getter = (target: P): undefined | V => get(target, symbol);
    const setter = <R extends V>(target: P, value: R) => set(target, symbol, value);
    return [getter, setter] as const;
};

const [getEdge, setEdge] = extension<Node, string>();
const [getImpl, setImpl] = extension<Node | VNode, VImpl>();
const [getEventMap, setEventMap] = extension<Element, EventMap>();

const useEventMap = (element: Element) => {
    return getEventMap(element) || setEventMap(element, {});
};

const getComponentID = (() => {
    const [get, set] = extension<VComp<any>, string>();
    const prefix = 'comp';
    let next = 0;
    return (f: VComp<any>) => {
        return get(f) || set(f, prefix + next++);
    };
})();

const eventHandle = function (this: Element, e: Event) {
    const f = getEventMap(this)![e.type];
    return f && f.call(this, e, this);
};

const WRAPPER = 'HS-WRAPPER';
class Wrapper extends HTMLElement {
    _cache: VImpl | null = null;
    _states: any[] = [];
    _waiting: (() => void)[] = [];
    _pending: (() => void)[] = [];
    _dirty: number = 0;

    constructor(readonly _factory: VComp<any>) {
        super();
        if (!_factory) {
            throw Error();
        }
    }

    disconnectedCallback() {
        resume(this._pending);
    }
}
customElements.define(WRAPPER.toLowerCase(), Wrapper);

let hookCursor = 0;
let current: Wrapper | null = null;

const render = (node: Wrapper, impl: VImpl) => {
    node._cache = impl;
    node._dirty = 0;
    hookCursor = 0;
    current = node;
    try {
        return node._factory(impl._attrs, node);
    } catch (e) {
        reportError(e);
        return [];
    } finally {
        current = null;
    }
};

const update = (node: Wrapper) => {
    if (node._dirty || !node._cache) return;
    node._dirty = raf(() => {
        if (!node._dirty) return;
        patch(node._cache!, node);
    });
};

const peek = () => {
    if (!current) {
        throw Error("illegal context");
    }
    return current;
};

const hook = <T>(f: () => T): T => {
    const hookValues = peek()._states;
    if (hookCursor >= hookValues.length) {
        hookValues[hookCursor] = f();
    }
    return hookValues[hookCursor++];
}

const VNode = (impl: VImpl): VNode => {
    const vnode: VNode = node => void patch(VElem(node.nodeName, [VNode(impl)]), node);
    setImpl(vnode, impl);
    return vnode;
};

const VImpl = (
    _type: string | VComp<any>,
    _attrs: Hash = {},
    _items: Hash<VImpl> = {}
): VImpl => {
    return { _type, _attrs, _items };
};

const VImplEmpty = VImpl('');

const VElem = (type: string, args: VArg[]): VImpl => {
    const attrs: Hash = {};
    const items: Hash<VImpl> = {};
    const edges: Hash<number> = {};

    const append = (item: VImpl) => {
        const tag = isFunction(item._type) ?
            getComponentID(item._type) :
            item._type;
        const key = item._attrs.key;
        const base = key != null ? tag + '#' + key : tag;
        const edge = base + ':' + (edges[base] = -~edges[base]);
        items[edge] = item;
    };

    const visit = (arg: VArg) => {
        if (arg == null) return;
        if (isFunction(arg)) {
            const item = getImpl(arg);
            if (item) append(item);
        } else if (isObject(arg)) {
            if (isArray(arg)) {
                arg.forEach(visit);
            } else {
                assign(attrs, arg);
            }
        } else {
            append(VImpl('#text', { _text: '' + arg }));
        }
    }

    args.forEach(visit);
    
    return VImpl(type, attrs, items);
};

const patch = (next: VImpl, node?: Node): Node => {
    if (!node) {
        // create a node if not given
        const type = next._type;
        if (type === '#text') {
            node = doc.createTextNode('');
        } else {
            const elem = isFunction(type) ?
                new Wrapper(type) :
                doc.createElement(type);
            const key = next._attrs.key;
            if (key != null) {
                elem.setAttribute('data-key', key)
            }
            node = elem;
        }
    }

    // render component's content
    if (isFunction(next._type)) {
        const contents = render(node as Wrapper, next);
        next = VElem(WRAPPER, [contents]);
    }

    // fetch previous vnode
    const prev = getImpl(node) || VImplEmpty;
    if (prev !== next) {
        const pAttrs = prev._attrs;
        const nAttrs = next._attrs;
        if (node instanceof Element) {
            // process attributes
            for (const name of keys(nAttrs)) {
                if (name === 'key') continue;

                const pAttr = pAttrs[name];
                const nAttr = nAttrs[name];

                if (pAttr === nAttr) continue;

                if (name.startsWith('on')) {
                    const eventType = name.slice(2);
                    const nFunc = isFunction(nAttr) ? nAttr : null;
                    const pFunc = isFunction(pAttr) ? pAttr : null;
                    useEventMap(node)[eventType] = nFunc;
                    if (pFunc && !nFunc) {
                        node.removeEventListener(eventType, eventHandle);
                    } else if (!pFunc && nFunc) {
                        node.addEventListener(eventType, eventHandle);
                    }
                } else if (name in node) {
                    if (name === 'style' && isObject(nAttr)) {
                        assign(get(node, name), nAttr);
                    } else {
                        set(node, name, nAttr);
                    }
                } else if (nAttr == null || nAttr === false) {
                    node.removeAttribute(name);
                } else {
                    node.setAttribute(name, nAttr);
                }
            }

            // process children
            const pItems = prev._items;
            const nItems = next._items;
            const children: Hash<Node> = {};

            // 1st: delete or select
            for (let child = node.firstChild; child;) {
                const nextChild = child.nextSibling;
                const edge = getEdge(child);
                if (edge && pItems[edge] && nItems[edge]) {
                    children[edge] = child;
                } else {
                    node.removeChild(child);
                }
                child = nextChild;
            }

            // 2nd: create or update and rearrange
            let nextChild = node.firstChild;
            for (const edge of keys(nItems)) {
                const child = patch(nItems[edge], children[edge]);
                setEdge(child, edge);
                if (nextChild !== child) {
                    node.insertBefore(child, nextChild);
                }
                nextChild = child.nextSibling;
            }
        } else {
            // Text Node
            const newValue = nAttrs._text || '';
            const oldValue = pAttrs._text || '';
            if (oldValue !== newValue)
                node.nodeValue = newValue;
        }
        setImpl(node, next);
    }
    if (node instanceof Wrapper) {
        resume(node._waiting);
    }
    return node;
};

const create: {
    (tag: HTMLElementTagName, ...args: VArg[]): VNode;
    <T extends Hash>(factory: VComp<T>, args: T): VNode;
    (factory: VComp): VNode;
} = (type: string | VComp<any>, ...args: any[]) => {
    return VNode(isFunction(type) ? VImpl(type, args[0]) : VElem(type.toUpperCase(), args));
};

const fold: {
    <S>(s: Supplier<S>): [S, Consumer<S>];
    <S>(s: Supplier<S>, r: (s: S) => S): [S, () => void];
    <S, A>(s: Supplier<S>, r: (s: S, a: A) => S): [S, Consumer<A>];
} = <S>(state: Supplier<S>, reducer?: (s: S, a?: any) => S) => {
    return hook(() => {
        const node = peek();
        const init = isFunction(state) ? state() : state;
        const fire = (action?: any) => {
            const newValue = reducer ?
                reducer(pair[0], action) : action;
            if (pair[0] !== newValue) {
                pair[0] = newValue;
                update(node);
            };
        }
        const pair: [S, Consumer<any> & (() => void)] = [init, fire];
        return pair;
    });
};

const memo = <T>(factory: () => T, deps: Dependency): T => {
    const pair: any[] = hook(() => []);
    if (!same(deps, pair[0])) {
        pair[0] = deps;
        pair[1] = factory();
    }
    return pair[1];
};

const post = (effect: Effect, deps?: Dependency) => {
    const pair = hook(() => {
        let cleanup: Cleanup;
        const fire = (effect?: Effect) => {
            if (cleanup) {
                safeCall(cleanup);
                cleanup = undefined;
            }
            if (effect) {
                cleanup = safeCall(effect);
            }
        };
        peek()._pending.push(fire);
        return [undefined as any, fire];
    });

    if (deps && same(deps, pair[0])) {
        return;
    }
    pair[0] = deps;
    peek()._waiting.push(() => pair[1](effect));
};

const side = (effect: Effect, deps?: Dependency) => {
    post(() => {
        let cleanup: Cleanup;
        invokeLater(() => {
            cleanup = safeCall(effect);
        });
        return () => {
            invokeLater(() => {
                if (cleanup) safeCall(cleanup);
            });
        };
    }, deps);
};

const pure = <T extends Hash>(f: VComp<T>) =>
    (props: T) => memo(() => create(f, props), props);
    
const h = assign(create, { fold, memo, post, side, pure, same });
export { h }
