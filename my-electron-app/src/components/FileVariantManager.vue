<script setup>
import ActionBtn from '@/components/lib/ActionBtn.vue'
import FileManager from '@/components/FileManager.vue'
import { ref, onMounted, getCurrentInstance, computed } from 'vue'
import { getFilename } from '@/helpers'

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

const getVariants = async () => {
  const { data } = await $apiService.sendMessage('get-variants', { file: props.currentFile }, {})
  variants.value = [...data, props.currentFile]
}

const saveVariant = async variant => {
  if (variants.value.includes(variant)) return
  await $apiService.sendMessage('save-variant', {
    file: { path: props.currentFile, type: props.type },
    variant,
  })
  variants.value.push(variant)
}

onMounted(() => {
  getVariants()
})
</script>

<template>
  <div class="d-flex ga-1 align-center">
    <div
      v-for="option in variants"
      :key="option"
      class="tab"
      :class="{ tab_active: option === currentFile }"
      @click="$emit('update:variant', option)"
    >
      {{ getFilename(option) }}
    </div>
    <ActionBtn
      icon="mdi-plus"
      class="tab"
      :hasPopup="true"
    >
      <template #popup>
        <slot name="popup">
          <FileManager
            :current-file="currentFile"
            :type="type"
            @update:current-file="saveVariant"
          />
        </slot>
      </template>
    </ActionBtn>
  </div>
</template>

<style scoped lang="scss">
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
