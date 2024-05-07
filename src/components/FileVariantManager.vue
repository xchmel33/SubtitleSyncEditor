<script setup>
import ActionBtn from '@/components/lib/ActionBtn.vue'
import FileManager from '@/components/FileManager.vue'
import { ref, onMounted, getCurrentInstance, watch } from 'vue'
import { getFilename, timestamp } from '@/utilities/helpers'

const { $apiService } = getCurrentInstance().appContext.config.globalProperties

const props = defineProps({
  currentFile: {
    type: String,
    default: '',
  },
  type: {
    type: String,
    default: 'subtitles',
  },
})
const variants = ref([])
const showDelete = ref(false)
const emit = defineEmits(['update:variant', 'keep-menu-open'])
const getVariants = async () => {
  const { data } = await $apiService.sendMessage('get-variants', { file: props.currentFile }, {})
  variants.value = [...data.map(x => x.path), props.currentFile].sort((a, b) => a.length - b.length)
}

const saveVariant = async variant => {
  if (variants.value.includes(variant)) return
  await $apiService.sendMessage('save-variant', {
    file: { path: props.currentFile, type: props.type, time: timestamp() },
    variant: { path: variant, type: props.type, time: timestamp() },
  })
  variants.value.push(variant)
  emit('update:variant', variant)
  emit('keep-menu-open', false)
}

const handleClick = variant => {
  if (variant === props.currentFile && variants.value.length > 1) {
    showDelete.value = !showDelete.value
  } else if (variant) {
    emit('update:variant', variant)
  }
}
const deleteVariant = async () => {
  const { data } = await $apiService.sendMessage('delete-variant', {
    file: { path: props.currentFile, type: props.type },
    variants: variants.value,
  })
  if (!data) return
  variants.value = variants.value.filter(x => x !== props.currentFile)
  emit('update:variant', data.next)
}

onMounted(() => {
  getVariants()
})
watch(() => props.currentFile, getVariants)
</script>

<template>
  <div class="d-flex ga-1 align-center">
    <div
      v-for="option in variants"
      :key="option"
      class="tab position-relative"
      :class="{ tab_active: option === currentFile }"
      @click="handleClick(option)"
    >
      {{ getFilename(option || 'No file selected') }}
      <div
        v-if="showDelete && option === currentFile"
        class="tooltip-delete text_button"
        @click="deleteVariant"
      >
        Delete variant
      </div>
    </div>
    <ActionBtn
      icon="mdi-plus"
      :hasPopup="true"
      :tooltip="currentFile ? 'Add language variant' : 'Open file'"
      @click="emit('keep-menu-open', true)"
    >
      <template #popup>
        <slot name="popup">
          <FileManager
            :current-file="currentFile"
            :type="type"
            :blacklist="variants"
            @update:current-file="saveVariant"
          />
        </slot>
      </template>
    </ActionBtn>
  </div>
</template>

<style scoped lang="scss">
.tooltip-delete {
  position: absolute;
  z-index: 99;
  background-color: red;
  transform: translateY(0.25rem) translateX(-1rem);
  width: 100%;
  font-size: 0.75rem;
}
.tab {
  padding: 0.15rem 1rem;
  cursor: pointer;
  border-radius: 0.5rem;
  border: 1px solid white;
  &_active {
    border-color: aqua;
  }
}
</style>
