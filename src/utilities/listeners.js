export const addEventListener = ({ element = window, event, handler }) => {
  element.addEventListener(event, handler)
}

export const removeEventListener = ({ element = window, event, handler }) => {
  element.removeEventListener(event, handler)
}

export const addListeners = (listeners, element = window) => {
  listeners.forEach(listener => {
    addEventListener({ element, event: listener.e, handler: listener.fn })
  })
}

export const removeListeners = (listeners, element = window) => {
  listeners.forEach(listener => {
    removeEventListener({ element, event: listener.e, handler: listener.fn })
  })
}

export const handleKeyCombination = ({
  e,
  targetKey,
  ctrl = false,
  shift = false,
  callback = () => {},
}) => {
  // console.log(e.key, targetKey)
  if (e.key !== targetKey) return false
  if (e.ctrlKey !== ctrl) return false
  if (e.shiftKey !== shift) return false
  if (callback) callback()
  return true
}
