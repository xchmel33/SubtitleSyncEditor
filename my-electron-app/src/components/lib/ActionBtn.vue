<script setup lang="js">
import MenuPopup from '@/components/lib/MenuPopup.vue'

defineProps({
  callback: {
    default: () => {},
  },
  icon: {
    default: '',
  },
  hasPopup: {
    default: false,
  },
})
</script>

<template>
  <MenuPopup
    v-if="hasPopup"
    variant="popcenter"
    appear
    @open="$emit('open', $event)"
  >
    <template #opener>
      <slot name="opener">
        <v-btn class="icon_button">
          <v-icon>{{ icon }}</v-icon>
        </v-btn>
      </slot>
    </template>
    <template #default>
      <slot name="popup"></slot>
    </template>
  </MenuPopup>
  <v-btn
    v-else
    class="icon_button"
    @click="callback"
  >
    <v-icon>{{ icon }}</v-icon>
  </v-btn>
</template>

<style scoped></style>
