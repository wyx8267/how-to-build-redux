// redux
const validateAction = action => {
  if (!action || typeof action !== 'object' || Array.isArray(action)) {
    throw new Error('Action must be an object!');
  }
  if (typeof action.type === 'undefined') {
    throw new Error('Action must have a type!');
  }
};

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

export {createStore, applyMiddleware}