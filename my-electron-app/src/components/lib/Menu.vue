<script setup>
import { ref, defineProps, onBeforeUnmount, watch } from 'vue'
import { fl_getVirtualEl, fl_setPositionStyle } from '@/utilities/float'

const props = defineProps({
  ignoreDataGwmenu: {
    type: Boolean,
    default: false,
  },
  useVirtualElement: {
    type: Boolean,
    default: false,
  },
  useTargetElement: {
    type: Boolean,
    default: false,
  },
  isEager: {
    type: Boolean,
    default: false,
  },
  referenceEl: {
    type: Object,
    default: () => null,
  },
  boundary: {
    type: Object,
    default: () => ({}), // Default to an empty object, adjust as needed
  },
  placement: {
    type: String,
    default: 'bottom-start',
  },
  flOptions: {
    type: Object,
    default: () => ({ offset: 4, padding: 0 }),
  },
  closeOnOutsideClick: {
    type: Boolean,
    default: true,
  },
  trigger: {
    type: String,
    default: 'click',
  },
  hasStretch: {
    type: Boolean,
    default: true,
  },
  zIndexContent: {
    type: Number,
    default: 99,
  },
})

const emit = defineEmits(['close', 'open'])

const open = ref('')
const minWidth = ref(0)
let mousedownInside = false
let closeOnMouseup = false

const addEventListeners = listeners => {
  listeners.forEach(([target, event, callback]) => {
    target.addEventListener(event, callback)
  })
}
const removeEventListeners = listeners => {
  listeners.forEach(([target, event, callback]) => {
    target.removeEventListener(event, callback)
  })
}

const handleClose = () => {
  closeOnMouseup = false
  // eslint-disable-next-line no-use-before-define
  removeListeners()
}

const toggleOpen = (bool = !open.value, e) => {
  open.value = bool ? open.value || `${Date.now() + Math.random()}` : ''

  if (!open.value) {
    handleClose()
    emit('close')
    return
  }
  requestAnimationFrame(() => {
    let referenceEl

    if (props.useVirtualElement && e) {
      referenceEl = fl_getVirtualEl({ e })
    } else if (props.useTargetElement) {
      referenceEl = e?.target
    } else {
      referenceEl = document.getElementById(`${open.value}_opener`)
    }

    const element = document.getElementById(open.value)

    if (!(referenceEl && element && element instanceof HTMLElement)) {
      handleClose()
      return
    }

    minWidth.value = props.hasStretch ? referenceEl.offsetWidth : 0

    const options = {
      strategy: 'fixed',
      placement: props.placement,
      ...props.flOptions,
    }
    fl_setPositionStyle({
      referenceEl,
      element,
      options,
      boundary: props.boundary || document,
    })
    // eslint-disable-next-line no-use-before-define
    setListeners()
    emit('open')
  })
}

const close = e => {
  toggleOpen(false, e)
  handleClose()
}

const cursorInside = el => {
  if (
    el.id === open.value ||
    el.id === `${open.value}_opener` ||
    (el.getAttribute('data-menu') === 'noclose' && !props.ignoreDataGwmenu)
  ) {
    return true
  }
  if (!el.parentElement) {
    return false
  }
  return cursorInside(el.parentElement)
}

const handleMouseup = e => {
  if (closeOnMouseup) {
    close(e)
  }
}

const handleMousedown = e => {
  closeOnMouseup = !props.closeOnOutsideClick ? false : !cursorInside(e.target)
}

const closeOnWindowLeave = e => {
  if (props.trigger === 'hover') {
    close(e)
  }
}

const setListeners = () => {
  addEventListeners([
    [document, 'mouseleave', closeOnWindowLeave],
    [document, 'mousedown', handleMousedown],
    [document, 'mouseup', handleMouseup],
    [document, 'touchstart', handleMousedown],
    [document, 'touchend', handleMouseup],
  ])
}

const removeListeners = () => {
  removeEventListeners([
    [document, 'mouseleave', closeOnWindowLeave],
    [document, 'mousedown', handleMousedown],
    [document, 'mouseup', handleMouseup],
    [document, 'touchstart', handleMousedown],
    [document, 'touchend', handleMouseup],
  ])
}

const handleClickOpener = (bool, e) => {
  if (props.trigger === 'click') {
    toggleOpen(bool, e)
  }
}
const handleMouseOpener = (bool, e) => {
  if (props.trigger === 'hover') {
    toggleOpen(bool, e)
  }
}

const handleMouseLeave = e => {
  if (props.trigger === 'hover') {
    const el = e.relatedTarget || e.toElement // firefox
    if (el && !cursorInside(el)) {
      toggleOpen(false, e)
    }
  }
}

onBeforeUnmount(() => {
  removeListeners()
})
</script>

<template>
  <div
    class="menu"
    :class="{ gw_pop_menu_open: open }"
    @mouseleave="handleMouseLeave"
  >
    <slot
      name="before"
      :methods="{ toggleOpen }"
    ></slot>
    <div
      v-if="!referenceEl && !useTargetElement"
      class="menu_opener"
      v-bind="open ? { id: `${open}_opener` } : {}"
      @click="e => handleClickOpener(!open, e)"
      @mouseenter="handleMouseOpener(true, $event)"
    >
      <slot
        name="opener"
        :value="open"
        :methods="{ toggleOpen }"
      ></slot>
    </div>

    <div
      v-if="open"
      v-show="open"
      :id="open"
      :key="open"
      class="menu_content anim-fade-in text-noselect"
      @mousedown="mousedownInside = true"
    >
      <slot :methods="{ toggleOpen }"></slot>
    </div>

    <!--    <portal
      v-else-if="isEager ? true : open"
      to="main_before"
    >
      <div
        v-show="open"
        :id="open"
        :key="open"
        :style="`min-width: ${minWidth}px; z-index: ${zIndexContent}`"
        class="menu_content anim-fade-in text-noselect"
        @mouseleave="handleMouseLeave"
        @mousedown="mousedownInside = true"
      ></div>
    </portal>-->
    <slot
      name="after"
      :value="open"
      :methods="{ toggleOpen }"
    ></slot>
  </div>
</template>
<style lang="scss" scoped>
.menu {
  position: relative;
  --content-z-index: 99;
  &_open {
    opacity: 1;
  }
  &_opener {
    inset: auto;
    position: relative;
  }
  &_content {
    position: fixed;
    z-index: var(--content-z-index, 10);
    background-color: var(--clr-black);
    border-radius: 4px;
  }
}
</style>
