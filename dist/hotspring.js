const { is, assign, keys } = Object;
const doc = document;
const raf = requestAnimationFrame;
const invokeLater = setTimeout;
const isFunction = (x) => typeof x === 'function';
const isObject = (x) => typeof x === 'object';
const isArray = Array.isArray;
const get = (o, k) => o[k];
const set = (o, k, v) => o[k] = v;
const reportError = (error) => {
    console.error(error);
};
const safeCall = (runnable) => {
    try {
        return runnable();
    }
    catch (e) {
        reportError(e);
    }
};
const resume = (runnables) => {
    runnables.forEach(safeCall);
    runnables.length = 0;
};
const same = (a, b) => {
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
const extension = () => {
    const symbol = Symbol();
    const getter = (target) => get(target, symbol);
    const setter = (target, value) => set(target, symbol, value);
    return [getter, setter];
};
const [getEdge, setEdge] = extension();
const [getImpl, setImpl] = extension();
const [getEventMap, setEventMap] = extension();
const useEventMap = (element) => {
    return getEventMap(element) || setEventMap(element, {});
};
const getComponentID = (() => {
    const [get, set] = extension();
    const prefix = 'comp';
    let next = 0;
    return (f) => {
        return get(f) || set(f, prefix + next++);
    };
})();
const eventHandle = function (e) {
    const f = getEventMap(this)[e.type];
    return f && f.call(this, e, this);
};
const WRAPPER = 'HS-WRAPPER';
class Wrapper extends HTMLElement {
    constructor(_factory) {
        super();
        this._factory = _factory;
        this._cache = null;
        this._states = [];
        this._waiting = [];
        this._pending = [];
        this._dirty = 0;
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
let current = null;
const render = (node, impl) => {
    node._cache = impl;
    node._dirty = 0;
    hookCursor = 0;
    current = node;
    try {
        return node._factory(impl._attrs, node);
    }
    catch (e) {
        reportError(e);
        return [];
    }
    finally {
        current = null;
    }
};
const update = (node) => {
    if (node._dirty || !node._cache)
        return;
    node._dirty = raf(() => {
        if (!node._dirty)
            return;
        patch(node._cache, node);
    });
};
const peek = () => {
    if (!current) {
        throw Error("illegal context");
    }
    return current;
};
const hook = (f) => {
    const hookValues = peek()._states;
    if (hookCursor >= hookValues.length) {
        hookValues[hookCursor] = f();
    }
    return hookValues[hookCursor++];
};
const VNode = (impl) => {
    const vnode = node => void patch(VElem(node.nodeName, [VNode(impl)]), node);
    setImpl(vnode, impl);
    return vnode;
};
const VImpl = (_type, _attrs = {}, _items = {}) => {
    return { _type, _attrs, _items };
};
const VImplEmpty = VImpl('');
const VElem = (type, args) => {
    const attrs = {};
    const items = {};
    const edges = {};
    const append = (item) => {
        const tag = isFunction(item._type) ?
            getComponentID(item._type) :
            item._type;
        const key = item._attrs.key;
        const base = key != null ? tag + '#' + key : tag;
        const edge = base + ':' + (edges[base] = -~edges[base]);
        items[edge] = item;
    };
    const visit = (arg) => {
        if (arg == null)
            return;
        if (isFunction(arg)) {
            const item = getImpl(arg);
            if (item)
                append(item);
        }
        else if (isObject(arg)) {
            if (isArray(arg)) {
                arg.forEach(visit);
            }
            else {
                assign(attrs, arg);
            }
        }
        else {
            append(VImpl('#text', { _text: '' + arg }));
        }
    };
    args.forEach(visit);
    return VImpl(type, attrs, items);
};
const patch = (next, node) => {
    if (!node) {
        // create a node if not given
        const type = next._type;
        if (type === '#text') {
            node = doc.createTextNode('');
        }
        else {
            const elem = isFunction(type) ?
                new Wrapper(type) :
                doc.createElement(type);
            const key = next._attrs.key;
            if (key != null) {
                elem.setAttribute('data-key', key);
            }
            node = elem;
        }
    }
    // render component's content
    if (isFunction(next._type)) {
        const contents = render(node, next);
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
                if (name === 'key')
                    continue;
                const pAttr = pAttrs[name];
                const nAttr = nAttrs[name];
                if (pAttr === nAttr)
                    continue;
                if (name.startsWith('on')) {
                    const eventType = name.slice(2);
                    const nFunc = isFunction(nAttr) ? nAttr : null;
                    const pFunc = isFunction(pAttr) ? pAttr : null;
                    useEventMap(node)[eventType] = nFunc;
                    if (pFunc && !nFunc) {
                        node.removeEventListener(eventType, eventHandle);
                    }
                    else if (!pFunc && nFunc) {
                        node.addEventListener(eventType, eventHandle);
                    }
                }
                else if (name in node) {
                    if (name === 'style' && isObject(nAttr)) {
                        assign(get(node, name), nAttr);
                    }
                    else {
                        set(node, name, nAttr);
                    }
                }
                else if (nAttr == null || nAttr === false) {
                    node.removeAttribute(name);
                }
                else {
                    node.setAttribute(name, nAttr);
                }
            }
            // process children
            const pItems = prev._items;
            const nItems = next._items;
            const children = {};
            // 1st: delete or select
            for (let child = node.firstChild; child;) {
                const nextChild = child.nextSibling;
                const edge = getEdge(child);
                if (edge && pItems[edge] && nItems[edge]) {
                    children[edge] = child;
                }
                else {
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
        }
        else {
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
const create = (type, ...args) => {
    return VNode(isFunction(type) ? VImpl(type, args[0]) : VElem(type.toUpperCase(), args));
};
const fold = (state, reducer) => {
    return hook(() => {
        const node = peek();
        const init = isFunction(state) ? state() : state;
        const fire = (action) => {
            const newValue = reducer ?
                reducer(pair[0], action) : action;
            if (pair[0] !== newValue) {
                pair[0] = newValue;
                update(node);
            }
            ;
        };
        const pair = [init, fire];
        return pair;
    });
};
const memo = (factory, deps) => {
    const pair = hook(() => []);
    if (!same(deps, pair[0])) {
        pair[0] = deps;
        pair[1] = factory();
    }
    return pair[1];
};
const post = (effect, deps) => {
    const pair = hook(() => {
        let cleanup;
        const fire = (effect) => {
            if (cleanup) {
                safeCall(cleanup);
                cleanup = undefined;
            }
            if (effect) {
                cleanup = safeCall(effect);
            }
        };
        peek()._pending.push(fire);
        return [undefined, fire];
    });
    if (deps && same(deps, pair[0])) {
        return;
    }
    pair[0] = deps;
    peek()._waiting.push(() => pair[1](effect));
};
const side = (effect, deps) => {
    post(() => {
        let cleanup;
        invokeLater(() => {
            cleanup = safeCall(effect);
        });
        return () => {
            invokeLater(() => {
                if (cleanup)
                    safeCall(cleanup);
            });
        };
    }, deps);
};
const pure = (f) => (props) => memo(() => create(f, props), props);
const h = assign(create, { fold, memo, post, side, pure, same });
export { h };
//# sourceMappingURL=hotspring.js.map