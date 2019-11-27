## Requirements

- ES6+
- [Custom Elements](https://html.spec.whatwg.org/multipage/custom-elements.html)
    - Note: Some browsers require polyfill currently.
    - [polyfills/packages/custom-elements at master · webcomponents/polyfills](https://github.com/webcomponents/polyfills/tree/master/packages/custom-elements)

## Restrictions

- Support HTML Element only.
    - XML, SVG, and MathML are not currently supported.
    - It may be introduced when non-HTML will support custom elements in the future.
    - [Proposal: Allow custom elements to be in any namespace · Issue #634 · w3c/webcomponents](https://github.com/w3c/webcomponents/issues/634#)

## Examples

- [Hello, World!](./examples/runner.html?helloworld.js)
- [Counter](./examples/runner.html?counter.js)
- [Frame count](./examples/runner.html?framecount.js)
- [TODO list mock](./examples/runner.html?todolist.js)
- [Trace rendering tree](./examples/runner.html?hooktree.js)
- [PingPong](./examples/runner.html?pingpong.js)

...TODO

## Usage

### import

use ES6 module

~~~js
import { h } from "./path/to/hotspring.js";
~~~

### generate VDOM tree

~~~js
const vdom = h(
    // 1st argument is tag name
    'div',

    // text content
    'hoge',
    10,
    false,

    // ignored
    null,
    undefined,

    // attributes
    {
        id: 'dom-id',
        onclick: () => console.log('ok'),
        key: 'main', 
        // `key` is used to detect the identity of the element.
        // It's bound to `data-key` attribute in real DOM.
    },
    
    // children
    h('p', 'hello!'),

    // just grouping (not affected to real DOM)
    [
        'other-text',
        h('span', 'other-child')
    ]
);
~~~

### apply VDOM to real DOM

a VDOM tree is a function to render content to real DOM.

~~~js
const container = document.getElementByID('root');
vdom(container);
~~~

#### sample code

~~~js
h('h1', 'hello')(document.body);
~~~

~~~html
<body>
    <h1>hello</h1>
</body>
~~~

### define Component

A component is just a function.

~~~js
const MyComponent = (props, root) => {
    return h('div', 'hello, ', props.message);
};
~~~

The first parameter is an arbitrary set of component properties.

The second parameter is the wrapper element on which the component will be rendered.

This element is an autonomous custom element (tagged with `hs-wrapper`)
that just groups component contents.

To make VDOM from a component, use `h` function (do not call directly).

~~~js
const vdom = h(MyComponent, { message: 'world!' });
~~~

This VDOM tree creates a real DOM tree as follows:

~~~html
<hs-wrapper>
    <div>hello, world!</div>  
</hs-wrapper>
~~~

#### Design notes

Unlike typical VDOM libraries, wrapper elements exist.

These impose some restrictions on the representation of components.

For example, a separate `li` element cannot be a single component
in order to create a correct HTML tree.

However, the presence of wrapper elements has some benefits.

The element allows you to describe operations easily that require node references.

~~~js
const MyComponent = (props, root) => {
    return h('div',
        h('input', {
            type: 'text'
        }),
        h('input', {
            type: 'button',
            value: 'alert',
            onclick: () => {
                const t = root.querySelector('input[type=text]');
                alert(t.value);
            }
        })
    );
};
~~~

Internally, there are advantages such as the simplicity of the diff-patch algorithm
by eliminating intermediate structures.

### Hooks

HotSpring provides 4 types of component hooks.

Hook functions can only be used inside components.

#### fold hook

The `fold` hook can be used to handle the component state.

If you give an initial state,
it returns a pair of current state and mutator function.

~~~js
const Counter = () => {
    const [count, setCount] = h.fold(0);
    return h('input', {
        type: 'button',
        value: count,
        onclick: () => setCount(count + 1)
    });
};
~~~

You can also pass a factory function instead of the initial state.
This is effective when the initial creation cost is high.

~~~js
const Counter = () => {
    const [count, setCount] = h.fold(() => 0);
    return h('input', {
        type: 'button',
        value: count,
        onclick: () => setCount(count + 1)
    });
};
~~~

If you want to treat a function as a state value, use a higher-order function as a factory.

~~~js
const [func, setFunc] = h.fold(() => /* return the function */);
~~~

If you give an initial state and a successor function,
it returns a pair of current state and update function.

~~~js
const Counter = () => {
    const [count, inc] = h.fold(0, x => x + 1);
    return h('input', {
        type: 'button',
        value: count,
        onclick: inc
    });
};
~~~

If you give an initial state and a reducer function,
it returns a pair of current state and dispatch function.

~~~js
const reducer = (state, action) => {
    switch(action) {
        case 'inc':
            return state + 1;
        case 'dec':
            return state - 1;
        default:
            return state;
    }
};
const Counter = () => {
    const [count, send] = h.fold(0, reducer);
    return h('input', {
        type: 'button',
        value: count,
        onclick: () => send('inc')
    });
};
~~~

#### memo hook

The `memo` hook memoize a function call according to given dependency.

~~~js
const ShowCalculatedValue = (props) => {
    const result = h.memo(() => {
        return heavyFunction(props.value)
    }, [props.value]);

    return h('span', result);
};
~~~

The first argument is the function to be called.

The second argument is a dependency to detect the need for recalculation.

A dependency is an array or an object, that holds dependent values.

The `memo` hook tests given values with shallow equality checking.

#### side hook

The `side` hook calls the side effect after the rendering pass.

~~~js
const MyComp = () => {
    h.side(() => {
        // side effect here.
    });
    return h('div', 'mycomp');
};
~~~

Like the `memo` hook, you can pass a dependency as the second argument.
In this case, the side effect only occur when there are changes on the dependency.

~~~js
const MyComp = props => {
    h.side(() => {
        console.log('message changed: ', props.message);
    }, [props.message]);
    return h('div', props.message);
};
~~~

A side effect function can return a cleanup task.
This task is called before the next side effect occurs
or after the component is removed.

~~~js
const MyComp = props => {
    h.side(() => {
        const resource = createSomeResource(props.message);
        console.log('allocate resource');
        return () => {
            resource.release();
            console.log(`release resource`);
        };
    }, [props.message]);
    return h('div', props.message);
};
~~~

#### post hook

The `post` hook is equivalent to the `side` hook,
except for the execution timing.

The effect passed to the `post` hook is called when:

- after the target component has finished rendering
- before the parent component has finished rendering

Simply put, you can describe effects that affect rendering.

More specifically, you can use `post` hooks to describe operations
based on component parent-child relationships.

~~~js
const MyComp1 = () => {
    console.log('comp1');
    h.post(() => console.log('comp1 end'));
    return h('div', 'comp1', h(MyComp2));
};
const MyComp2 = () => {
    console.log('comp2');
    h.post(() => console.log('comp2 end'));
    return h('div', 'comp2', h(MyComp3));
};
const MyComp3 = () => {
    console.log('comp3');
    h.post(() => console.log('comp3 end'));
    return h('div', 'comp3');
};
~~~

When `MyComp1` is rendered, the above code outputs as follows:

~~~
comp1
comp2
comp3
comp3 end
comp2 end
comp1 end
~~~

This mechanism allows you to create views based on custom contexts.

### Misc.

#### shallow equality checking

`same` function tests two objects with shallow equality checking.

~~~js
const a = [1, 2, 3];
const b = [1, 2, 3];
console.log(a === b); // false
console.log(h.same(a, b)); // true

const c = { x: 1, y: 2 };
const d = { x: 1, y: 2 };
console.log(h.same(c, d)); // true

const e = { x: 1, y: 2, z: {} };
const f = { x: 1, y: 2, z: {} };
console.log(h.same(e, f)); // false, e.z !== f.z
~~~

#### memoize component

`pure` function memoize a component itself.

~~~js
const MyComp = h.pure(props => {
    return h('div',
      props.value1,
      props.value2,
      props.value3
    );
});
~~~

If there are no changes in `props`,
it will return the same virtual DOM without calling the component function,
and rendering will be skipped.

This `pure` function is defined as follows:

~~~js
const pure = comp => props => h.memo(() => h(comp, props), props);
~~~

#### event receiver

For convenience, the event receiver node is passed in the second parameter of the handler.

~~~js
// unfocus when clicked
const vdom = h('button', 'myButton', {
    onclick: (event, self) => self.blur()
});
~~~
