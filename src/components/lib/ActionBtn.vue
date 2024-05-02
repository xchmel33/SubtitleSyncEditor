<script setup lang="js">
import MenuPopup from '@/components/lib/MenuPopup.vue'

const props = defineProps({
  callback: {
    default: () => {},
  },
  icon: {
    default: '',
  },
  hasPopup: {
    default: false,
  },
  size: {
    default: '',
  },
  rotate: {
    default: 0,
  },
  tooltip: {
    default: '',
  },
})
const getIconSize = () => {
  switch (props.size) {
    case 'small':
      return '1rem'
    case 'medium':
      return '1.25rem'
    case 'large':
      return '1.5rem'
    default:
      return ''
  }
}
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
        <v-tooltip
          v-if="tooltip"
          location="top"
          :text="tooltip"
        >
          <template v-slot:activator="{ props }">
            <v-btn class="icon_button">
              <v-icon
                v-bind="props"
                :style="{ transform: rotate ? `rotate(${rotate}deg)` : 'none' }"
                :size="getIconSize()"
                >{{ icon }}</v-icon
              >
            </v-btn>
          </template>
        </v-tooltip>
        <v-btn
          v-else
          class="icon_button"
        >
          <v-icon
            v-bind="props"
            :style="{ transform: rotate ? `rotate(${rotate}deg)` : 'none' }"
            :size="getIconSize()"
            >{{ icon }}</v-icon
          >
        </v-btn>
      </slot>
    </template>
    <template #default>
      <slot name="popup"></slot>
    </template>
  </MenuPopup>
  <v-tooltip
    v-else-if="tooltip"
    location="top"
    :text="tooltip"
  >
    <template v-slot:activator="{ props }">
      <v-btn
        class="icon_button"
        :class="`icon_button_${size}`"
        @click="callback"
      >
        <v-icon
          v-bind="props"
          :style="{ transform: rotate ? `rotate(${rotate}deg)` : 'none' }"
          :size="getIconSize()"
          >{{ icon }}</v-icon
        >
      </v-btn>
    </template>
  </v-tooltip>
  <v-btn
    v-else
    class="icon_button"
    :class="`icon_button_${size}`"
    @click="callback"
  >
    <v-icon
      :style="{ transform: rotate ? `rotate(${rotate}deg)` : 'none' }"
      :size="getIconSize()"
      >{{ icon }}</v-icon
    >
  </v-btn>
</template>

<style scoped></style>
