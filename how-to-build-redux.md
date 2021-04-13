# 如何实现Redux

> p.s. 翻译粗糙，详见[原文](https://zapier.com/engineering/how-to-build-redux/)

Redux是一个简单的库，可帮助您管理JavaScript应用的状态。尽管它有这种简单性，但在学习时还是很容易掉进无底洞。我发现自己在解释Redux时，几乎总是从展示如何实现它开始。所以这就是我们要做的：从头开始构建实现有效的Redux。我们的实现不会涵盖所有细微差别，但我们将展示大部分的奥秘。

请注意，从技术上讲，我们将构建Redux和React Redux。 多数情况下我们将Redux与React配合使用。但是，即使您将Redux与其他东西结合使用，此处的大多数内容仍然适用。

让我们开始吧。

## 创建一个状态对象

大多数应用会从服务器获取状态，但是让我们从本地创建状态开始。即使我们正在从服务器检索，我们也必须在应用程序中添加一些初始化内容。我们将做一个简单的笔记应用。这主要是为了避免制作又一个todo应用，但也会促使我们之后对state做一些有趣的东西。

```js
const initialState = {
  nextNoteId: 1,
  notes: {}
};
```

首先，注意到我们的数据只是一个普通的JS对象。Redux管理状态的更改，但并不关心状态本身。

### 为什么要使用Redux?

在深入之前，让我们看看在没有Redux的情况下构建应用是什么感觉。像这样把`initialState`添加到`window`。

`window.state = initialState;`

我们的store来了！好像我们不需要什么恶心的redux。让我们创建一个用来添加笔记的组件。

```js
const onAddNote = () => {
  const id = window.state.nextNoteId;
  window.state.notes[id] = {
    id,
    content: ''
  };
  window.state.nextNoteId++;
  renderApp();
};

const NoteApp = ({notes}) => (
  <div>
    <ul className="note-list">
    {
      Object.keys(notes).map(id => (
        // 显然这里应该渲染一些比id更有趣的东西
        <li className="note-list-item" key={id}>{id}</li>
      ))
    }
    </ul>
    <button className="editor-button" onClick={onAddNote}>New Note</button>
  </div>
);

const renderApp = () => {
  ReactDOM.render(
    <NoteApp notes={window.state.notes}/>,
    document.getElementById('root')
  );
};

renderApp();
```

[在JSFiddle上查看](https://jsfiddle.net/justindeal/5j3can1z/102/)

这不是一个非常有用的应用，但可以正常运行。似乎我们已经证明，没有Redux就可以实现。所以这篇文章结束了？

当然没有。

让我们往后延伸一点，我们添加了很多功能，为它建立了完整的后台服务，开了一家公司，这样我们就可以出售订阅服务，吸引很多客户，接着再添加很多新功能，赚点钱，发展公司……好吧，我们有点离题了。

在这个简单的示例中很难体现，但是在我们迈向成功的道路上，我们的应用可能会持续扩大规模，扩展到包含数百个组件和数百个文件。我们的应用将具有异步操作，因此可能出现以下代码：

```js
const onAddNote = () => {
  window.state.onLoading = true;
  renderApp();
  api.createNote()
    .then((note) => {
      window.state.onLoading = false;
      window.state.notes[id] = note;
      renderApp();
    });
};
```

然后就会出现这样的bug：

```js
const ARCHIVE_TAG_ID = 0;

const onAddTag = (noteId, tagId) => {
  window.state.onLoading = true;
  // 糟糕，忘记在这里进行渲染loading
  // 在高速的本地开发中可能不会注意到
  api.addTag(noteId, tagId)
    .then(() => {
      window.state.onLoading = false;
      window.state.tagMapping[tagId] = noteId;
      if (ARCHIVE_TAG_ID) {
        // 出现错误，if内永远不会执行
        window.state.archived = window.state.archive || {};
        window.state.archived[noteId] = window.state.notes[noteId];
        delete window.state.notes[noteId];
      }
      renderApp();
    });
};
```

还可能出现一些根本没人知道在做什么的临时性的状态改变：

```js
const SomeEvilComponent = () => {
  <button onClick={() => window.state.pureEvil = true}>Do Evil</button>
};
```

当这些全部混合在一个大型的、由很多开发人员开发了很长一段时间的大型项目中时，会产生很多问题：

  1. 任何地方都可能引起渲染，可能会有怪异的UI故障或无响应故障在看似随机的时间点出现。
  2. 即使在我们在此处看到的少量代码中，也潜伏着冲突。
  3. 这种混乱几乎是不可能测试的。必须使整个应用程序处于特定状态，然后用棍子戳它（人为干预），然后查看整个应用的状态以确认是否符合期望。
  4. 如果出现bug，你本可以做一些有根据的猜测，但从根本上说，代码的每一行都是一个嫌疑对象。

最后一点是迄今为止最糟糕的问题，也是选择Redux的主要原因。如果您想减少应用的复杂性，最好的办法（以我的观点）是限制更改state的方式和范围。Redux并不是解决其他问题的灵丹妙药，但由于对state更改做了限制，可能会减少其他问题。


## Reducer

那么Redux是如何提供这些限制并帮助您管理状态的呢？您可以从一个简单的函数开始，该函数接受当前状态state和一个操作action，并返回新状态。对于我们的笔记应用，如果我们提供一个添加笔记的动作，我们应该获得一个添加了新的笔记的新状态。

```js
const CREATE_NOTE = 'CREATE_NOTE';
const UPDATE_NOTE = 'UPDATE_NOTE';

const reducer = (state = initialState, action) => {
  switch (action.type) {
    case CREATE_NOTE:
      return // 返回创建了新笔记的新的state
    case UPDATE_NOTE:
      return // 返回更新了笔记的新的state
    default:
      return state
  }
};
```

如果switch语句使您感到麻烦，则不必以这种方式编写reducer。可以使用一个对象，并将每个类型的键指向其对应的处理程序，如下所示：

```js
const handlers = {
  [CREATE_NOTE]: (state, action) => {
    return // 返回创建了新笔记的新的state
  },
  [UPDATE_NOTE]: (state, action) => {
    return // 返回更新了笔记的新的state
  }
};

const reducer = (state = initialState, action) => {
  if (handlers[action.type]) {
    return handlers[action.type](state, action);
  }
  return state;
};
```

这部分并不太重要。reducer是你的函数，你可以用任何你想要的方式实现它。Redux真的不在乎。

### Immutability（不可变性）

Redux真正关心的是你的reducer是一个纯函数，意思是，你永远，永远，永远都不应该像这样去编写reducer：

```js
const reducer = (state = initialState, action) => {
  switch (action.type) {
    case CREATE_NOTE: {
      // 不要直接修改STATE!!!
      state.notes[state.nextNoteId] = {
        id: state.nextNoteId,
        content: ''
      };
      state.nextNoteId++;
      return state;
    }
    case UPDATE_NOTE: {
      // 不要直接修改STATE!!!
      state.notes[action.id].content = action.content;
      return state;
    }
    default:
      return state;
  }
};
```

实际上，如果这样改变state，Redux根本就不会起作用。因为直接更改state后，状态对象的引用不会更新，因此应用的各个部分将无法正确更新。另外也无法使用某些Redux开发人员工具，因为这些工具会跟踪以前的state。如果您一直在改变当前的state对象，则无法回到以前的state。

原则上，突变状态使得从可组合的部分构建reducer(以及应用程序的其他部分)变得更加困难。纯函数是可预测的，因为当给定相同的输入时，它们产生相同的输出。如果你养成了一种直接改变state的习惯，那么一切都完了。调用函数变得不确定。你必须把整个函数树记在脑子里。

但是，这种可预测性是有代价的，特别是因为JavaScript本身并不支持不可变对象。在我们的示例中，将使用原生的JavaScript，这将增加一些额外的代码。如下是我们真正需要写这个reducer的方法：

```js
const reducer = (state = initialState, action) => {
  switch (action.type) {
    case CREATE_NOTE: {
      const id = state.nextNoteId;
      const newNote = {
        id,
        content: ''
      };
      return {
        ...state,
        nextNoteId: id + 1,
        notes: {
          ...state.notes,
          [id]: newNote
        }
      };
    }
    case UPDATE_NOTE: {
      const {id, content} = action;
      const editedNote = {
        ...state.notes[id],
        content
      };
      return {
        ...state,
        notes: {
          ...state.notes,
          [id]: editedNote
        }
      };
    }
    default:
      return state;
  }
};
```

我在这里使用展开语法（`...`），从技术上讲，这还不是ECMAScript的一部分（ES6：现在是了），但是可以肯定的是，这是很安全的选择。如果要避免使用非标准功能，则可以使用`Object.assign`。两种方法的概念相同：请勿更改state，而是创建状态和任何嵌套对象/数组的浅表副本。对于对象的任何不变的部分，我们仅引用现有的部分。如果我们仔细看一下这段代码：

```js
return {
  ...state,
  notes: {
    ...state.notes,
    [id]: editedNote
  }
};
```

我们仅更改`notes`属性，因此`state`的其他属性将保持完全相同。`...state`只是说要按原样重用那些现有属性。同样，在`notes`中，我们只更改正在编辑的一个笔记，属于`...state.notes`的其他数据将保持不变。这样我们可以利用`shouldComponentUpdate`或`PureComponent`。如果组件具有未更改的note作为props，则可以避免重新渲染。记住这一点，我们还必须避免这样编写reducer：

```js
const reducer = (state = initialState, action) => {
  // 确实避免了变化，但还是……不要这样做！！！
  state = _.cloneDeep(state)
  switch (action.type) {
    // ...
    case UPDATE_NOTE: {
      // 看，现在可以安全地更改旧state了
      state.notes[action.id].content = action.content;
      return state;
    }
    default:
      return state;
  }
};
```

这将返回简洁的处理state变化的代码，如果您这样做，在技术上是可行的，但您将忽略所有潜在的性能问题。每个对象和数组在每次状态变化时都将是全新的，所以任何依赖于这些对象和数组的组件都必须重新渲染，即使你实际上没有做任何变化。

我们的不可变reducer绝对需要更多的思想和代码来完善。但是随着时间的推移，您会逐渐意识到状态更改功能是被隔离的并且易于测试。对于真正的应用，您可能需要使用`lodash-fp`或`Ramda`或`Immutable.js`之类的东西。在Zapier（原作者所属机构），我们使用了`immutability-helper`的变体，它非常简单。然而我仍要提醒你，这是一个很大的无底洞，我甚至开始以不同的方式来编写库。原生JS也很好，在强大的类型解决方案（例如`Flow`和`TypeScript`）中可能会更好地发挥作用。只要确保坚持使用简单的函数即可。这很像使用React做出的权衡：您可能会得到比同等jQuery解决方案更多的代码，但是每个组件的可预测性要高得多。

### Using our Reducer

让我们向reducer添加一个action，然后得到新的state

```js
const state0 = reducer(undefined, {
  type: CREATE_NOTE
});
```

现在的 `state0`：

```js
{
  nextNoteId: 2,
  notes: {
    1: {
      id: 1,
      content: ''
    }
  }
}
```

请注意，在本例中，我们输入`undefined`作为状态。Redux总是将`undefined`作为初始状态传入，但通常你会使用一个默认参数`state = initialState`来获取初始状态对象。下一次，Redux将输入前一个状态。

```js
const state1  = reducer(state0, {
  type: UPDATE_NOTE,
  id: 1,
  content: 'Hello, world!'
});
```

现在的 `state1`：

```js
{
  nextNoteId: 2,
  notes: {
    1: {
      id: 1,
      content: 'Hello, world!'
    }
  }
}
```

[在JSFiddle上查看](https://jsfiddle.net/justindeal/kLkjt4y3/37/)

当然，Redux不会像这样继续创建更多变量，但是我们将尽快得到一个真正的实现。关键是，Redux的核心实际上只是您编写的一段代码，一个简单的函数，它接受上一个state，并执行一个action并返回下一个state。 为什么将该功能称为reducer？因为它将直接插入标准的`reduce`函数。

```js
const actions = [
  {type: CREATE_NOTE},
  {type: UPDATE_NOTE, id: 1, content: 'Hello, world!'}
];

const state = actions.reduce(reducer, undefined);
```

现在，`state`看起来与之前的`state1`相同：

```js
{
  nextNoteId: 2,
  notes: {
    1: {
      id: 1,
      content: 'Hello, world!'
    }
  }
}
```

尝试将新的action添加到我们的`action`数组中，并将它们添加到reducer中。

[在JSFiddle上查看](https://jsfiddle.net/justindeal/edogdh33/13/)

现在您可以理解为什么Redux将自己标榜为“ JavaScript应用的可预测状态容器”。因为输入相同的一组操作，最终都拥有相同的state。函数式编程万岁！如果您听说过Redux易重播的特性，大致就是这个意思。尽管开箱即用，但Redux不会保留actions。相反，只有一个变量指向state对象，并且我们不断更改该变量以指向下一个state。 这是您的应用中允许的一个重要突变，但是我们将在`store`内部控制该突变。

## Store

现在让我们建立一个store，该store将保留我们的单个state变量以及一些用于设置和获取state的有用方法。

```js
const validateAction = action => {
  if (!action || typeof action !== 'object' || Array.isArray(action)) {
    throw new Error('Action must be an object!');
  }
  if (typeof action.type === 'undefined') {
    throw new Error('Action must have a type!');
  }
};

const createStore = (reducer) => {
  let state = undefined;
  return {
    dispatch: (action) => {
      validateAction(action)
      state = reducer(state, action);
    },
    getState: () => state
  };
};
```

现在你知道为什么我们用常量而不是字符串了吧。我们对action的验证比Redux的稍松一些，但它足够确保我们不会拼错action类型。如果我们传递字符串，那么我们的action可能会遵循reducer的默认情况，错误可能会被忽略。但是如果我们使用常量，那么输入错误将被视为未定义，然后将抛出错误。所以我们马上就会发现并解决它。

现在让我们创建一个store并使用它。

```js
// 传入我们在前边创建的reducer
const store = createStore(reducer);

store.dispatch({
  type: CREATE_NOTE
});

store.getState();
// {
//   nextNoteId: 2,
//   notes: {
//     1: {
//       id: 1,
//       content: ''
//     }
//   }
// }
```

在这一点上，这是相当有用的。我们拥有了一个可以使用我们提供的任何reducer来管理状态的store。 但是它仍然缺少重要的一点：一种可以订阅更改的方法。没有这些，它将需要一些笨拙的命令性代码。当我们稍后引入异步操作时，它就会无法工作。 因此，让我们继续实现订阅：

```js
const createStore = reducer => {
  let state;
  const subscribers = [];
  const store = {
    dispatch: action => {
      validateAction(action);
      state = reducer(state, action);
      subscribers.forEach(handler => handler());
    },
    getState: () => state,
    subscribe: handler => {
      subscribers.push(handler);
      return () => {
        const index = subscribers.indexOf(handler);
        if (index > 0) {
          subscribers.splice(index, 1);
        }
      };
    }
  };
  store.dispatch({type: '@@redux/INIT'});
  return store;
};
```

createStore中添加了更多的代码，但不会很难以理解。`subscribe`函数接受一个处理函数，并将其添加到订阅列表中。然后返回一个取消订阅的函数。任何时候我们调用`dispatch`，我们都会通知所有的处理函数。现在，每次状态改变时都可以很容易地重新渲染了。

[在JSFiddle上查看](https://jsfiddle.net/justindeal/8cpu4ydj/27/)

试着编辑代码并派发更多action，HTML页面将始终展现最新的store状态。当然，对于真正的应用，我们希望将这些调度功能与用户操作联系起来。我们接下来就会解决这个问题！

### 添加你的组件

如何让组件与Redux一起工作？只需要创建普通的React组件传递props即可。您带来了自己的state，那么就创建与该state(或部分state)一起工作的组件。有一些细微差别可能会影响后边的设计，尤其是性能方面，但在大多数情况下，死板的未优化的组件是一个很好的开始。

```js
const NoteEditor = ({note, onChangeNote, onCloseNote}) => (
  <div>
    <div>
      <textarea
        className="editor-content"
        autoFocus
        value={note.content}
        onChange={event => onChangeNote(note.id, event.target.value)}
        rows={10} cols={80}
      />
    </div>
    <button className="editor-button" onClick={onCloseNote}>Close</button>
  </div>
);

const NoteTitle = ({note}) => {
  const title = note.content.split('\n')[0].replace(/^\s+|\s+$/g, '');
  if (title === '') {
    return <i>Untitled</i>;
  }
  return <span>{title}</span>;
};

const NoteLink = ({note, onOpenNote}) => (
  <li className="note-list-item">
    <a href="#" onClick={() => onOpenNote(note.id)}>
      <NoteTitle note={note}/>
    </a>
  </li>
);

const NoteList = ({notes, onOpenNote}) => (
  <ul className="note-list">
    {
      Object.keys(notes).map(id =>
        <NoteLink
          key={id}
          note={notes[id]}
          onOpenNote={onOpenNote}
        />
      )
    }
  </ul>
);

const NoteApp = ({
  notes, openNoteId, onAddNote, onChangeNote,
  onOpenNote, onCloseNote
}) => (
  <div>
    {
      openNoteId ?
        <NoteEditor
          note={notes[openNoteId]} onChangeNote={onChangeNote}
          onCloseNote={onCloseNote}
        /> :
        <div>
          <NoteList notes={notes} onOpenNote={onOpenNote}/>
          <button className="editor-button" onClick={onAddNote}>New Note</button>
        </div>
    }
  </div>
);
```

```
NoteApp
  |--NoteEditor
  |--NoteList
      |--NoteLink
          |--NoteTitle
```

这部分没什么可看的。我们可以将props输入这些组件并立即进行渲染。但是，让我们看一下`openNoteId`属性以及那些`onOpenNote`和`onCloseNote`回调。我们可以只使用组件state去确定该状态和这些回调的位置。没有规定说所有state都需要进入Redux存储。如果想知道何时必须存储state，只需问问自己：

> 卸载此组件后该状态是否需要存在？

如果答案是否定的，那么使用组件state就足够了。对于必须持久化保存到服务器或跨许多组件共享的状态(这些组件可能需要独立地挂载和卸载)，Redux可能是更好的选择。

在某些情况下，尽管Redux处理暂态时表现良好。（暂态：例如带网络请求的action的loading和error状态）特别是，当更改store而需要更改暂态时，仅将暂态保留在store中可能会容易一些。对于我们的应用，当我们创建笔记时，我们希望将`openNoteId`设置为新的笔记ID。反映组件内部状态很麻烦，因为我们必须监视`componentWillReceiveProps`中store的更改。 这并不是说它是错误的，只是它可能很尴尬。因此，对于我们的应用，我们将用store存储`openNoteId`。

您需要存储暂态的另一个原因可能只是为了能够从Redux developer tools访问它。使用重放之类的东西就能轻松的查看store。而且，从局部组件state开始，然后切换到store也是非常容易的。只需确保像存储状态一样为本地状态创建容器组件就行。

那么，让我们调整reducer来处理这个暂态。

```js
const OPEN_NOTE = 'OPEN_NOTE';
const CLOSE_NOTE = 'CLOSE_NOTE';

const initialState = {
  // ...
  openNoteId: null
};

const reducer = (state = initialState, action) => {
  switch (action.type) {
    case CREATE_NOTE: {
      const id = state.nextNoteId;
      // ...
      return {
        ...state,
        // ...
        openNoteId: id,
        // ...
      };
    }
    // ...
    case OPEN_NOTE: {
      return {
        ...state,
        openNoteId: action.id
      };
    }
    case CLOSE_NOTE: {
      return {
        ...state,
        openNoteId: null
      };
    }
    default:
      return state;
  }
};
```

### 手动连接组件与Redux

好的，现在我们可以将其连接起来了。为了不涉及现有的组件，我们将创建一个新的容器组件，该组件从store获取state并将其传递到我们的NoteApp。

```js
class NoteAppContainer extends React.Component {
  constructor(props) {
    super();
    this.state = props.store.getState();
    this.onAddNote = this.onAddNote.bind(this);
    this.onChangeNote = this.onChangeNote.bind(this);
    this.onOpenNote = this.onOpenNote.bind(this);
    this.onCloseNote = this.onCloseNote.bind(this);
  }
  componentWillMount() {
    this.unsubscribe = this.props.store.subscribe(() =>
      this.setState(this.props.store.getState())
    );
  }
  componentWillUnmount() {
    this.unsubscribe();
  }
  onAddNote() {
    this.props.store.dispatch({
      type: CREATE_NOTE
    });
  }
  onChangeNote(id, content) {
    this.props.store.dispatch({
      type: UPDATE_NOTE,
      id,
      content
    });
  }
  onOpenNote(id) {
    this.props.store.dispatch({
      type: OPEN_NOTE,
      id
    });
  }
  onCloseNote() {
    this.props.store.dispatch({
      type: CLOSE_NOTE
    });
  }
  render() {
    return (
      <NoteApp
        {...this.state}
        onAddNote={this.onAddNote}
        onChangeNote={this.onChangeNote}
        onOpenNote={this.onOpenNote}
        onCloseNote={this.onCloseNote}
      />
    );
  }
}

ReactDOM.render(
  <NoteAppContainer store={store}/>,
  document.getElementById('root')
);
```

现在完整可用了，试试看！

[在JSFiddle上查看](https://jsfiddle.net/justindeal/8bL9tL0z/23/)

我们的应用程序将会派发action，这些action通过我们的reducer更新store，而我们的订阅则使视图保持同步。如果最终状态不符合预期，则不必查看所有组件，只需查看reducer和actions即可。

## Provider以及Connect

好的，一切正常。 但是……还有一些问题。

  1. Wiring feels imperative.（需要接线？
  2. 容器组件中有很多重复项。
  3. 每次我们要将store连接到组件时，我们都必须使用全局store对象。否则，我们将不得不在整个树中以props传递store。或者，我们将不得不在顶层将其连接一次，然后将所有内容向下传递到树上，这在大型应用程序中可能并不好。

这就是为什么我们需要React Redux的`Provider`以及`connect`的原因。首先，让我们创建一个`Provider`组件。

```js
class Provider extends React.Component {
  getChildContext() {
    return {
      store: this.props.store
    };
  }
  render() {
    return this.props.children;
  }
}

Provider.childContextTypes = {
  store: PropTypes.object
};
```

很简单，`Provider`组件使用React的上下文功能将store props转换为上下文属性。Context是一种将信息从顶级组件向下传递到子代组件的方法，而中间的组件则不必显式传递props。通常，您应该避免使用上下文，因为React文档中是这样说的：

> 如果你想让你的应用程序稳定，不要使用context。这是一个实验性的API，很可能会在React的未来版本中被打破。

这就是为什么我们的实现不要求任何人直接使用context。相反，我们将这个实验性API封装在组件中，因此如果它发生了变化，我们可以改变我们的实现，而不需要开发人员改变他们的代码。

所以现在我们需要一种将context转换回props的方法。这就是`connect`的作用所在。

```js
const connect = (
  mapStateToProps = () => ({}),
  mapDispatchToProps = () => ({})
) => Component => {
  class Connected extends React.Component {
    onStoreOrPropsChange(props) {
      const {store} = this.context;
      const state = store.getState();
      const stateProps = mapStateToProps(state, props);
      const dispatchProps = mapDispatchToProps(store.dispatch, props);
      this.setState({
        ...stateProps,
        ...dispatchProps
      });
    }
    componentWillMount() {
      const {store} = this.context;
      this.onStoreOrPropsChange(this.props);
      this.unsubscribe = store.subscribe(() => this.onStoreOrPropsChange(this.props));
    }
    componentWillReceiveProps(nextProps) {
      this.onStoreOrPropsChange(nextProps);
    }
    componentWillUnmount() {
      this.unsubscribe();
    }
    render() {
      return <Component {...this.props} {...this.state}/>;
    }
  }

  Connected.contextTypes = {
    store: PropTypes.object
  };

  return Connected;
}
```

有点复杂，说实话，与实际相比已经简化了很多。(我们在最后会稍微讨论一下。)但这已经很接近了。`connect`是一个高阶组件。事实上，它是一个更高层次的部件工厂。它接受两个函数，并返回一个函数，该函数接受一个组件，并返回一个新组件。该组件订阅store，并在组件发生更改时更新组件的props。

### 自动连接组件与Redux

```js
const mapStateToProps = state => ({
  notes: state.notes,
  openNoteId: state.openNoteId
});

const mapDispatchToProps = dispatch => ({
  onAddNote: () => dispatch({
    type: CREATE_NOTE
  }),
  onChangeNote: (id, content) => dispatch({
    type: UPDATE_NOTE,
    id,
    content
  }),
  onOpenNote: id => dispatch({
    type: OPEN_NOTE,
    id
  }),
  onCloseNote: () => dispatch({
    type: CLOSE_NOTE
  })
});

const NoteAppContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(NoteApp);
```

嘿，看起来好多了！

传递给`connect` (`mapStateToProps`)的第一个函数从`store`中获取当前状态并返回一些props。传递给`connect` (`mapDispatchToProps`)的第二个函数接受`store`的`dispatch`方法，并返回更多的props。这会返回一个新函数，我们把组件传递给这个函数，就会返回一个新组件，它将自动获得所有映射好的props(加上我们传入的任何额外props)。现在我们只需要使用我们的`Provider`组件，以便`connect`可以从上下文中获取存储。

```js
ReactDOM.render(
  <Provider store={store}>
    <NoteAppContainer/>
  </Provider>,
  document.getElementById('root')
);
```

好了，我们的store只在顶层传入一次，然后`connect`将其收集起来并完成所有工作。

[在JSFiddle上查看](https://jsfiddle.net/justindeal/srnf5n20/10/)

## Middleware 中间件

现在我们已经建立了一些非常有用的东西，但还有一处很大的缺陷。某些情况下，我们希望与服务器进行对话。但现在我们的操作都是同步的，如何进行异步操作呢？我们可以从组件中获取远程数据，但仍有一些问题：
  1. Redux（除了`Provicer`和`connect`）并不是特定于React的。如果能有一个Redux自己的解决方案就好了。
  2. 有时在获取数据时需要访问state。 我们不想在任何地方都绕过state。因此，我们最终不得不构建诸如`connect`之类的东西来进行数据提取。
  3. 目前情况下，如果不使用组件，就无法测试涉及数据获取的state更改。如果我们可以独立的获取数据，这会更有利于测试。
  4. 最后，我们将失去一些工具化的好处。

既然Redux是同步的，这该如何实现呢？我们通过在dispatch的中途放置一些东西并更改store state。这个东西就是中间件。

我们需要一种将中间件传递到store的方法，让我们开始吧。

```js
const createStore = (reducer, middleware) => {
  let state;
  const subscribers = [];
  const coreDispatch = action => {
    validateAction(action);
    state = reducer(state, action);
    subscribers.forEach(handler => handler());
  };
  const getState = () => state;
  const store = {
    dispatch: coreDispatch,
    getState,
    subscribe: handler => {
      subscribers.push(handler);
      return () => {
        const index = subscribers.indexOf(handler)
        if (index > 0) {
          subscribers.splice(index, 1);
        }
      };
    }
  };
  if (middleware) {
    const dispatch = action => store.dispatch(action);
    store.dispatch = middleware({
      dispatch,
      getState
    })(coreDispatch);
  }
  coreDispatch({type: '@@redux/INIT'});
  return store;
}
```

现在函数有点复杂了，但重要的部分是最后一个if语句。

```js
if (middleware) {
  const dispatch = action => store.dispatch(action);
  store.dispatch = middleware({
    dispatch,
    getState
  })(coreDispatch);
}
```

我们创建了一个将“重新派发”的函数。

`const dispatch = action => store.dispatch(action);`

如果一个中间件决定dispatch一个新的action，这个新的action会通过中间件返回。我们必须创建这个函数以更改store的dispatch函数。这是另一个突变让事情变得更容易的地方。只要Redux有助于执行规则，它就可以打破规则。: -)

```js
store.dispatch = middleware({
  dispatch,
  getState
})(coreDispatch);
```

这里调用了中间件，并向其传递一个对象，该对象可以访问我们的“重新派发”功能以及我们的`getState`函数。中间件将返回一个新功能，该功能可以调用下一个dispatch，在当前情况下，该功能只是原始的dispatch。 如果您感觉有些混乱，请不要担心，创建和使用中间件实际上很容易。

好的，让我们创建一个中间件来延迟dispatch一秒钟。没什么用，但它能展示异步操作。

```js
const delayMiddleware = () => next => action => {
  setTimeout(() => {
    next(action);
  }, 1000);
};
```

这个例子看起来超级傻，但它符合我们之前创造的谜题。它是一个函数，返回一个函数，该函数接受下一个dispatch函数。“下一个”函数执行操作。好吧，看起来Redux的箭头函数有点疯狂，但是有一个原因，我们很快就会指出来。现在，让我们在store中引入中间件。

`const store = createStore(reducer, delayMiddleware);`

是的，它成功使我们的应用程序变慢了！亲自体验一下这个可怕的应用程序。

[在JSFiddle上查看](https://jsfiddle.net/justindeal/56uf0uy7/7/)

### 连接多个中间件

现在让我们创建另一个(更有用的)日志中间件。

```js
const loggingMiddleware = ({getState}) => next => action => {
  console.info('before', getState());
  console.info('action', action);
  const result = next(action);
  console.info('after', getState());
  return result;
};
```

这很有用，让我们将其添加到我们的store中。但现在我们的store只接受一种中间件。那么我们需要一种将中间件组合在一起的方法。因此，我们要找到一种将许多中间件转变为一个中间件的方法。开始构建`applyMiddleware`！

```js
const applyMiddleware = (...middlewares) => store => {
  if (middlewares.length === 0) {
    return dispatch => dispatch;
  }
  if (middlewares.length === 1) {
    return middlewares[0](store);
  }
  const boundMiddlewares = middlewares.map(middleware =>
    middleware(store)
  );
  return boundMiddlewares.reduce((a, b) =>
    next => a(b(next))
  );
};
```

首先要注意的是，它接受一组中间件并返回一个中间件函数。这个新的中间件函数与之前的中间件具有相同的结构。它接受一个store(实际上只是我们的re-`dispatch`和`getState`方法，而不是整个store)并返回另一个函数。对于这个函数：

  1. 如果没有传入中间件，则返回原本的dispatch函数。 基本上，只是一个无操作中间件。这很愚蠢，但只是在阻止特殊情况。
  2. 如果我们有一个中间件函数，我们返回那个中间件函数。同样，只是在阻止特殊情况。
  3. 将一组中间件绑定到我们的伪store中。终于做正事了。
  4. 将所有这些功能绑定到next dispatch。 这就是为什么我们的中间件必须一直使用箭头函数。我们剩下的一个函数将采取行动，并能够继续调用next dispatch函数，直到最终到达原始的dispatch函数。

现在我们可以使用所有我们想要的中间件了。

```js
const store = createStore(reducer, applyMiddleware(
  delayMiddleware,
  loggingMiddleware
));
```

现在我们实现的Redux可以处理所有的事情！

[在JSFiddle上查看](https://jsfiddle.net/justindeal/3ukd4mL7/52/)

### Thunk middleware

现在让我们来做一些真正的异步。为此，我们将引入一个“thunk”中间件

```js
const thunkMiddleware = ({dispatch, getState}) => next => action => {
  if (typeof action === 'function') {
    return action(dispatch, getState);
  }
  return next(action);
};
```

“Thunk”实际上只是“function”的另一个名称，但它通常意味着“一个包装了一些待完成的工作的函数”。现在将`thunkMiddleware`加入：

```js
const store = createStore(reducer, applyMiddleware(
  thunkMiddleware,
  loggingMiddleware
));
```

然后做一些这样的操作：

```js
store.dispatch(({getState, dispatch}) => {
  // 从state获取一些东西
  const someId = getState().someId;
  // 获取一些依赖于现有数据的东西
  fetchSomething(someId)
    .then((something) => {
      dispatch({
        type: 'someAction',
        something
      });
    });
});
```

thunk中间件十分有用。我们可以从state内取出任何我们想要的东西，然后在任何时间dispatch任何我们想要的操作。这确实很灵活，但随着应用程序规模的增长，它可能会变得有点危险。目前是一个很好的开始。让我们用它来做一些异步工作。

首先，我们模拟一个api：

```js
const createFakeApi = () => {
  let _id = 0;
  const createNote = () => new Promise(resolve => setTimeout(() => {
    _id++
    resolve({
      id: `${_id}`
    })
  }, 1000));
  return {
    createNote
  };
};

const api = createFakeApi()
```

这个API只支持一个创建笔记并返回新id的方法。由于我们现在从服务器获取id，我们需要再次调整reducer。

```js
const initialState = {
  notes: {},
  openNoteId: null,
  isLoading: false
};

const reducer = (state = initialState, action) => {
  switch (action.type) {
    case CREATE_NOTE: {
      if (!action.id) {
        return {
          ...state,
          isLoading: true
        };
      }
      const newNote = {
        id: action.id,
        content: ''
      };
      return {
        ...state,
        isLoading: false,
        openNoteId: action.id,
        notes: {
          ...state.notes,
          [action.id]: newNote
        }
      };
    }
    // ...
  }
};
```

这里，我们使用`CREATE NOTE`操作来设置加载状态并在store中实际创建新的笔记。我们只使用id属性的存在与否来表示区别。你可能想要为你的应用程序使用不同的操作，但再次强调，Redux并不真正关心你使用的是什么。如果你想要一些规范性的东西，你可以看看[Flux Standard Actions](https://github.com/redux-utilities/flux-standard-action?utm_source=zapier.com&utm_medium=referral&utm_campaign=zapier&utm_source=zapier.com&utm_medium=referral&utm_campaign=zapier)。

现在让我们调整`mapDispatchToProps`来派发一个thunk。

```js
const mapDispatchToProps = dispatch => ({
  onAddNote: () => dispatch(
    (dispatch) => {
      dispatch({
        type: CREATE_NOTE
      });
      api.createNote()
        .then(({id}) => {
          dispatch({
            type: CREATE_NOTE,
            id
          });
        });
    }
  ),
  // ...
});
```

[在JSFiddle上查看](https://jsfiddle.net/justindeal/o27j5zs1/8/)

但是等等，除了我们在组件中丢弃的一些丑陋的代码外，我们还发明了中间件来去除这些代码。但现在我们把它又放回去了。如果我们使用一些自定义api中间件而不是使用thunk，我们就可以摆脱它。但即使使用了thunk中间件，我们仍然可以让各部分代码更有条理。

## Action Creators

与其从组件中派发thunk，不如将其抽象化放入函数中。

```js
const createNote = () => {
  return (dispatch) => {
    dispatch({
      type: CREATE_NOTE
    });
    api.createNote()
      .then(({id}) => {
        dispatch({
          type: CREATE_NOTE,
          id
        })
      });
  }
};
```

我们刚刚发明了一个action创建函数，没有花哨的东西，它们只是返回需要派发的action。有助于：

  1. 抽象出一个thunk action
  2. 简化代码，特别是多个组件有相同的操作时。Keep your code DRY! [DRY-Don't repeat yourself](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself)
  3. 分离开组件与action，使组件含义简单明确。

我们本可以更早地引入action creator，但没有理由。我们的应用程序很简单，所以没有重复任何操作。

让我们再次调整`mapDispatchToProps`以使用action creator。

```js
const mapDispatchToProps = dispatch => ({
  onAddNote: () => dispatch(createNote()),
  // ...
});
```

[在JSFiddle上查看-最终结果](https://jsfiddle.net/justindeal/5j3can1z/171/)

## 最后

您建立了自己的Redux！似乎我们写了很多代码，但是其中大多数是我们的reducer和组件。我们实际的Redux实现代码非常少，不到140行。其中包括我们的thunk和日志中间件，空行以及一些注释！

虽然距离真正的Redux和制作一个真正的应用程序还差得有些远。继续阅读，我们将讨论其中的一些内容。但是，希望本指南对你理解Redux有所启发！
