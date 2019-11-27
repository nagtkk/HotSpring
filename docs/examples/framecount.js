import { h } from './hotspring.min.js';

const App = () => {
    return [
        h('h1', 'Frame count'),
        h(FrameCount)
    ];
};

const FrameCount = () => {
    const [frameCount, update] = h.fold(0, x => x + 1);
    update(); // schedule next frame
    return h('span', 'frame: ', frameCount);
};

h(App)(root);
