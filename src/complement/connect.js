export const connect = (selector, dispatchSelector) => (Component) => {
  return (props) => {
    const [, update] = useState({})
    const data = selector ? selector(state) : { state }
    const dispatcher = dispatchSelector ? dispatchSelector(dispatch) : { dispatch }
    useEffect(() => store.subscribe(() => {
      const newData = selector ? selector(state) : { state }
      if (changed(data, newData)) {
        console.log('update')
        update({})
      }
    }), [selector])

    return <Component {...props} {...data} {...dispatcher} state={state} />
  }
}