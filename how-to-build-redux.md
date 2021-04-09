# 如何实现Redux

> p.s. 翻译粗糙，详见[原文](https://zapier.com/engineering/how-to-build-redux/)

Redux是一个简单的库，可帮助您管理JavaScript应用的状态。尽管它有这种简单性，但在学习时还是很容易掉进兔子洞。我发现自己在解释Redux时，几乎总是从展示如何实现它开始。所以这就是我们要做的：从头开始构建实现有效的Redux。我们的实现不会涵盖所有细微差别，但我们将展示大部分的奥秘。

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

