// https://floating-ui.com
import { computePosition, offset, shift, flip, detectOverflow } from '@floating-ui/dom'

export const fl_setPositionStyle = ({
  referenceEl,
  element,
  options,
  modifiers = {
    has_flip: true,
    has_shift: true,
  },
  boundary,
}) => {
  if (!referenceEl || !element) return

  options = options || {}
  const offsetValue = options.offset ?? 2
  const paddingValue = options.padding ?? 4

  const middleware = [
    offset(offsetValue),
    ...(modifiers.has_shift ? [shift({ padding: paddingValue })] : []),
    ...(modifiers.has_flip ? [flip()] : []),
    // autoPlacement(),
    ...(boundary
      ? [
          {
            name: 'detectOverflow',
            async fn(middlewareArgs) {
              const overflow = await detectOverflow(middlewareArgs, { boundary })
              const { top, bottom, left, right } = overflow
              const { ignoreBoundary } = options
              // let ignoreBoundary = options.ignoreBoundary || boundary.offsetWidth<
              const x = ignoreBoundary
                ? middlewareArgs.x
                : right > 0
                  ? middlewareArgs.x - right
                  : left > 0
                    ? middlewareArgs.x + left
                    : middlewareArgs.x < 0 || middlewareArgs.x === 0
                      ? 0
                      : middlewareArgs.x
              const y = ignoreBoundary
                ? middlewareArgs.y
                : bottom > 0
                  ? middlewareArgs.y - bottom
                  : top > 0
                    ? middlewareArgs.y + top
                    : middlewareArgs.y < 0 || middlewareArgs.y === 0
                      ? 0
                      : middlewareArgs.y

              // console.log({
              //   overflow,
              //   mdArgs,
              //   x,
              //   y,
              //   top,
              //   bottom,
              //   left,
              //   right,
              //   boundary,
              // })
              return { x, y }
            },
          },
        ]
      : []),
  ]

  try {
    computePosition(referenceEl, element, {
      placement: options.placement || 'bottom-start',
      strategy: options.strategy || 'fixed',
      middleware,
      ...options,
    }).then(
      ({
        x,
        y,
        // placement,
        // strategy,
        // middlewareData,
        // ...rest
      }) => {
        // console.log({
        //   x,
        //   y,
        //   placement,
        //   strategy,
        //   middlewareData,
        //   ...rest,
        // })
        // console.log(rest)
        element.style.position = options.strategy || 'fixed'
        element.style.left = `${x}px`
        element.style.top = `${y}px`
      },
    )
  } catch (error) {
    console.log(referenceEl)
    console.log(element)
    console.error('EROR - fl_setPositionStyle')
  }
}

export const fl_getVirtualEl = ({ e, options = {} }) => {
  if (e?.touches) {
    e = {
      clientX: e?.touches[0]?.clientX,
      clientY: e?.touches[0]?.clientY,
    }
  }
  let { clientX, clientY } = e
  clientX += options.offset || options.offsetX || 0
  clientY += options.offset || options.offsetY || 0
  const virtualEl = {
    getBoundingClientRect() {
      return {
        width: 0,
        height: 0,
        x: clientX,
        y: clientY,
        left: clientX,
        right: clientX,
        top: clientY,
        bottom: clientY,
      }
    },
  }
  return virtualEl
}

export const fl_followMouse = (e, boundary, customEl, options, modifiers) => {
  boundary = boundary ?? e.currentTarget
  if (!boundary) return
  let element = customEl
  const virtualEl = fl_getVirtualEl({ e, options })
  fl_setPositionStyle({
    referenceEl: virtualEl,
    element,
    options,
    boundary,
    modifiers,
    // modifiers: {
    //   has_flip: false,
    //   has_shift: false,
    // },
  })
}
