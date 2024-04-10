<script setup>
import Menu from '@/components/lib/Menu.vue'
import { ref } from 'vue'

defineProps({
  variant: {
    type: String,
    default: 'slidetop',
  },
  appear: {
    type: Boolean,
    default: true,
  },
})
const menuOpen = ref(false)
const emit = defineEmits(['open'])
const handleOpen = () => {
  menuOpen.value = true
  emit('open', true)
}
const handleClose = () => {
  menuOpen.value = false
  emit('open', false)
}
</script>

<template>
  <div
    class="overlay"
    v-if="menuOpen"
  ></div>
  <transition
    :name="variant"
    :appear="appear"
  >
    <Menu
      :ignoreDataGwmenu="true"
      :useVirtualElement="true"
      :isEager="true"
      @open="handleOpen"
      @close="handleClose"
    >
      <template #opener>
        <slot name="opener"></slot>
      </template>
      <template #default>
        <slot name="default"></slot>
      </template>
    </Menu>
  </transition>
</template>

<style lang="scss" scoped>
.slidetop-leave-active,
.slidetop-enter-active,
.slideright-enter-active,
.slideright-leave-active,
.slidebottom-enter-active,
.slidebottom-leave-active,
.slideleft-enter-active,
.slideleft-leave-active {
  transition: all 0.33s ease-out;
}
.slidetop-leave-to,
.slidetop-enter-from {
  transform: translateY(-100%);
}
.slideright-enter-from,
.slideright-leave-to {
  transform: translateX(100%);
}
.slidebottom-enter-from,
.slidebottom-leave-to {
  transform: translateY(100%);
}
.slideleft-enter-from,
.slideleft-leave-to {
  transform: translateX(-100%);
}

/* Center popup animations */
.popcenter-enter-active,
.popcenter-leave-active {
  transition: opacity 0.33s ease;
}
.popcenter-enter-from,
.popcenter-leave-to {
  opacity: 0;
}
.overlay {
  position: fixed; /* or absolute, depending on your layout */
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5); /* Adjust color and opacity as needed */
  z-index: 10; /* Ensure this is below the FileManager but above other content */
}
</style>
