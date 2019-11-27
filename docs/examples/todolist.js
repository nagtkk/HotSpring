import { h } from "./hotspring.min.js";

const makeToDoList = () => {
    return { next: 0, items: [] };
};

const processToDoList = (state, action) => {
    switch (action.type) {
        case 'create':
            return {
                next: state.next + 1,
                items: [...state.items, {
                    id: state.next,
                    value: action.value,
                    time: new Date()
                }]
            };
        case 'delete':
            return {
                next: state.next,
                items: state.items.filter(item => item.id !== action.id)
            };
        default:
            return state;
    }
};

const App = () => {
    const [model, control] = h.fold(makeToDoList, processToDoList);

    return h('div',
        h('h1', "Todo List"),
        h('p', '* click entry to delete'),
        h(TodoListView, { model, control })
    );
};

const TodoListView = ({ model, control }) => {
    const Item = item => {
        return h('p', {
            key: item.id,
            onclick: () => control({ type: 'delete', id: item.id }),
            style: {
                cursor: 'pointer'
            }
        },
            h('span', item.value),
            h('small', ' from ', item.time.toLocaleString()),
            h('small', ' (ID=', item.id, ')')
        );
    };

    const onsubmit = (event, form) => {
        event.preventDefault();
        const data = new FormData(form);
        const value = data.get('value');
        if (!value) return;
        form.reset();
        control({ type: 'create', value });
    };

    return h('div',
        h('form', { onsubmit },
            h('input', {
                name: 'value',
                placeholder: 'input TODO',
                autocomplete: 'off'
            })
        ),
        model.items.length ?
            model.items.map(Item) :
            h('p', '** no items **')
    );
};

h(App)(root);
