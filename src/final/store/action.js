import TYPES from './type'

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

const createNote = () => {
  return (dispatch) => {
    dispatch({
      type: TYPES.CREATE_NOTE
    });
    api.createNote()
      .then(({id}) => {
        dispatch({
          type: TYPES.CREATE_NOTE,
          id
        })
      });
  }
};

export {createNote}