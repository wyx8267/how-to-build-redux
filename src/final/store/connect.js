import { createNote } from './action'
import TYPES from './type'

const mapStateToProps = state => ({
  notes: state.notes,
  openNoteId: state.openNoteId
});

const mapDispatchToProps = dispatch => ({
  onAddNote: () => dispatch(createNote()),
  onChangeNote: (id, content) => dispatch({
    type: TYPES.UPDATE_NOTE,
    id,
    content
  }),
  onOpenNote: id => dispatch({
    type: TYPES.OPEN_NOTE,
    id
  }),
  onCloseNote: () => dispatch({
    type: TYPES.CLOSE_NOTE
  })
});

export {mapStateToProps, mapDispatchToProps}