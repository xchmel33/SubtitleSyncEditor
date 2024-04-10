<script setup>
import ActionBtn from '@/components/lib/ActionBtn.vue'

defineProps({
  options: {
    type: Array,
    default: () => [],
  },
  active: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <div
    v-if="active"
    class="d-flex align-center justify-space-between"
    style="position: absolute; top: 0; right: 0.5rem; color: white; width: calc(100% - 1rem)"
  >
    <slot name="left">
      <div></div>
    </slot>
    <div class="d-flex">
      <ActionBtn
        v-for="option in options"
        :key="option.icon"
        :icon="option.icon"
        :callback="option.method"
        :hasPopup="option.hasPopup"
        @open="$emit('open', $event)"
      >
        <template #popup>
          <slot
            name="popup"
            :item="{ ...option }"
          ></slot>
        </template>
      </ActionBtn>
    </div>
  </div>
</template>

<style scoped></style>
