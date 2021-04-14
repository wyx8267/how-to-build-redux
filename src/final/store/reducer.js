import TYPES from './type'

const initialState = {
  notes: {},
  openNoteId: null,
  isLoading: false
};

export const reducer = (state = initialState, action) => {
  switch (action.type) {
    case TYPES.CREATE_NOTE: {
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
    case TYPES.UPDATE_NOTE: {
      const {id, content} = action;
      const editedNote = {
        ...state.notes[id],
        content
      };
      return {
        ...state,
        openNoteId: action.id,
        notes: {
          ...state.notes,
          [id]: editedNote
        }
      };
    }
    case TYPES.OPEN_NOTE: {
      return {
        ...state,
        openNoteId: action.id
      };
    }
    case TYPES.CLOSE_NOTE: {
      return {
        ...state,
        openNoteId: null
      }
    }
    default:
      return state;
  }
};