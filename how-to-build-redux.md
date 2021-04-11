# 如何实现Redux

> p.s. 翻译粗糙，详见[原文](https://zapier.com/engineering/how-to-build-redux/)

Redux是一个简单的库，可帮助您管理JavaScript应用的状态。尽管它有这种简单性，但在学习时还是很容易掉进无底洞。我发现自己在解释Redux时，几乎总是从展示如何实现它开始。所以这就是我们要做的：从头开始构建实现有效的Redux。我们的实现不会涵盖所有细微差别，但我们将展示大部分的奥秘。

请注意，从技术上讲，我们将构建Redux和React Redux。 多数情况下我们将Redux与React配合使用。但是，即使您将Redux与其他东西结合使用，此处的大多数内容仍然适用。

让我们开始吧。

## 创建一个状态对象

大多数应用会从服务器获取状态，但是让我们从本地创建状态开始。即使我们正在从服务器检索，我们也必须在应用程序中添加一些初始化内容。我们将做一个简单的笔记应用。这主要是为了避免制作又一个todo应用，but it will also force us to make an interesting state decision later.

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

Boom——我们的store来了!我们不需要什么恶心的redux。让我们创建一个用来添加笔记的组件。

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
  // 糟糕，忘记在这里进行渲染
  // 在高速的本地服务器中可能不会注意到
  api.addTag(noteId, tagId)
    .then(() => {
      window.state.onLoading = false;
      window.state.tagMapping[tagId] = noteId;
      if (ARCHIVE_TAG_ID) {
        // 糟糕，这里出现了命名错误。可能是非法搜查和替换的结果。直到我们测试没人真正使用的档案页面时才会注意到。
        // 【archived】 ======> 【archive】
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

我们的不可变reducer绝对需要更多的思想和代码来完善。但是随着时间的推移，您会逐渐意识到状态更改功能是被隔离的并且易于测试。对于真正的应用，您可能需要使用`lodash-fp`或`Ramda`或`Immutable.js`之类的东西。在Zapier（原作者所属机构），我们使用了`immutability-helper`的变体，它非常简单。然而我仍要提醒你，这是一个很大的无底洞，我甚至开始以不同的方式来编写库。原生JS也很好，在强大的输入解决方案（例如`Flow`和`TypeScript`）中可能会更好地发挥作用。只要确保坚持使用较小的功能即可。这很像使用React做出的权衡：您可能会得到比同等jQuery解决方案更多的代码，但是每个组件的可预测性要高得多。

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