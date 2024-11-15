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
  hasOverlay: {
    default: true,
  },
  bgColor: {
    default: '',
  },
  rounded: {
    default: false,
  },
})
const getIconSize = () => {
  switch (props.size) {
    case 'mini':
      return '0.75rem'
    case 'small':
      return '1rem'
    case 'medium':
      return '1.25rem'
    case 'large':
      return '1.5rem'
    case 'xlarge':
      return '2rem'
    default:
      return ''
  }
}
</script>

<template>
  <div>
    <MenuPopup
      :has-overlay="hasOverlay"
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
              <v-btn
                :class="`icon_button icon_button_${size}`"
                :color="bgColor || undefined"
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
            :class="`icon_button icon_button_${size}`"
            :color="bgColor || undefined"
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
      <template #default="{ methods }">
        <slot
          name="popup"
          :methods="methods"
        ></slot>
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
          :style="rounded ? 'border-radius: 50%' : ''"
          :class="`icon_button_${size}`"
          :size="size"
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
      :color="bgColor || undefined"
      @click="callback"
    >
      <v-icon
        :style="{ transform: rotate ? `rotate(${rotate}deg)` : 'none' }"
        :size="getIconSize()"
        >{{ icon }}</v-icon
      >
    </v-btn>
  </div>
</template>

<style scoped></style>
