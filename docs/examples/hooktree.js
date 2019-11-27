import { h } from './hotspring.min.js';

const App = () => {
    console.log('begin render');
    h.post(() => console.log("end render"))
    return [
        "see developer console",
        h(MyComp1)
    ];
};
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

h(App)(root);
