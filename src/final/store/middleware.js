const thunkMiddleware = ({dispatch, getState}) => next => action => {
  if (typeof action === 'function') {
    return action(dispatch, getState);
  }
  return next(action);
};

const loggingMiddleware = ({getState}) => next => action => {
  console.info('before', getState());
  console.info('action', action);
  const result = next(action);
  console.info('after', getState());
  return result;
};

export {thunkMiddleware, loggingMiddleware}