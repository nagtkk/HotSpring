import { h } from './hotspring.min.js';

const collide = (a, b) => {
    const x0 = b.x;
    const y0 = b.y;
    const x1 = a.x;
    const y1 = a.y;
    const w = b.width / 2 + a.width / 2;
    const h = b.height / 2 + a.height / 2;
    const dx = x1 - x0;
    const dy = y1 - y0;
    const mx = w - Math.abs(dx);
    const my = h - Math.abs(dy);
    if (mx <= 0 || my <= 0) {
        return [0, 0];
    } else if (mx < my) {
        return [Math.sign(dx) * mx, 0];
    } else {
        return [0, Math.sign(dy) * my];
    }
};

const setSign = (v, s) => {
    return s ? v * Math.sign(v) * Math.sign(s) : v;
};

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

class MyGame {
    constructor() {
        this.width = 400;
        this.height = 400;

        const angle = 2 * Math.PI * Math.random();
        const speed = 5;
        this.ball = {
            dx: speed * Math.cos(angle),
            dy: speed * Math.sin(angle),
            x: 100,
            y: 100,
            width: 40,
            height: 40,
            color: "red"
        };
        this.bar = {
            x: 100,
            y: 300,
            width: 70,
            height: 20,
            color: "green"
        };
    }

    move(x, y) {
        const xmin = this.bar.width / 2;
        const xmax = this.width - xmin;
        this.bar.x = clamp(x, xmin, xmax);

        // const ymin = this.bar.height / 2;
        // const ymax = this.height - ymin;
        // this.bar.y = clamp(y, ymin, ymax);
    }

    tick() {
        const ball = this.ball;

        const xmin = ball.width / 2;
        const xmax = this.width - xmin;
        
        const ymin = ball.height / 2;
        const ymax = this.height - ymin;

        let x = ball.x;
        let y = ball.y;
        let dx = ball.dx;
        let dy = ball.dy;

        if (x + dx < xmin || x + dx > xmax) dx *= -1;
        if (y + dy < ymin || y + dy > ymax) dy *= -1;

        ball.dx = dx;
        ball.dy = dy;
        ball.x = clamp(x + dx, xmin, xmax);
        ball.y = clamp(y + dy, ymin, ymax);

        const [mx, my] = collide(ball, this.bar);
        ball.x += mx;
        ball.y += my;
        ball.dx = setSign(ball.dx, mx);
        ball.dy = setSign(ball.dy, my);
    }
}

const mousePos = (event, element) => {
    let x = element.offsetLeft;
    let y = element.offsetTop;
    while (element = element.offsetParent) {
        x += element.offsetLeft;
        y += element.offsetTop;
    }
    return [event.pageX - x, event.pageY - y];
}

const px = x => x + 'px';

const App = () => {
    const [flag, go] = h.fold(false, () => true);
    return [
        h('h1', "App with mutable object"),
        flag ? h(GameView) : h('div',
            'click to start',
            {
                onclick: go,
                style: {
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '400px',
                    height: '400px',
                    background: '#ccc'
                }
            }
        )
    ];
};

const GameView = (props, root) => {
    // make state once
    const game = h.memo(() => new MyGame(), []);

    // listen document event
    h.post(() => {
        const stage = root.querySelector('.stage');
        const onmousemove = (event) => {
            const [x, y] = mousePos(event, stage);
            game.move(x, y);
        };
        document.addEventListener('mousemove', onmousemove);
        return () => {
            document.removeEventListener('mousemove', onmousemove);
        }
    }, []);

    // active animation
    const redraw = h.fold({}, () => {
        game.tick(); return {};
    })[1];
    redraw();

    const sprite = (name, value, style = {}) => {
        return h('div', {
            class: name,
            style: Object.assign({
                position: 'absolute',
                background: value.color,
                left: px(value.x - value.width / 2),
                top: px(value.y - value.height / 2),
                width: px(value.width),
                height: px(value.height),
            }, style)
        })
    };

    return h('div', {
        class: 'stage',
        style: {
            position: 'relative',
            background: '#ccc',
            width: px(game.width),
            height: px(game.height)
        }
    },
        sprite('ball', game.ball, { borderRadius: '50%' }),
        sprite('bar', game.bar)
    );

};

h(App)(root);
