import { h } from './hotspring.min.js';

const App = () => {
    return [
        h('h1', 'count up!'),
        h(Counter),
        h(Counter),
        h(Counter),
    ];
};

const Counter = () => {
    const [value, onclick] = h.fold(0, x => x + 1);
    return h('input', {
        type: 'button',
        value,
        onclick,
        style: {
            fontSize: 'xx-large',
            padding: '1em 2em',
            cursor: 'pointer',
            margin: '0.5em'
        }
    });
};

h(App)(root);
