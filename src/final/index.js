import React from 'react'
import ReactDOM from 'react-dom'
import { createStore, applyMiddleware } from './redux'
import {reducer} from './store/index'
import { thunkMiddleware, loggingMiddleware } from './store/middleware'
import { mapStateToProps, mapDispatchToProps } from './store/connect'
import { Provider, connect } from './react-redux'

const store = createStore(reducer, applyMiddleware(
  thunkMiddleware,
  loggingMiddleware
));

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


const NoteAppContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(NoteApp);

ReactDOM.render(
  <Provider store={store}>
    <NoteAppContainer/>
  </Provider>,
  document.getElementById('root')
);