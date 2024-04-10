<script setup lang="js">
import ActionMenu from '@/components/lib/ActionMenu.vue'
import FileManager from '@/components/FileManager.vue'
import { parseSubtitles } from '@/helpers'
import { ref, reactive, computed, watch, getCurrentInstance, onMounted } from 'vue'
import FileVariantManager from '@/components/FileVariantManager.vue'

const { $apiService, $error } = getCurrentInstance().appContext.config.globalProperties

const props = defineProps({
  subtitles: {
    type: Array,
    default: () => [],
  },
  hasVideo: {
    type: Boolean,
    default: false,
  },
  file: { String, default: '' },
  rows: { Number, default: 0 },
})

const hovered = ref(false)
const menuOpen = ref(false)
const extracting = ref(false)

const emit = defineEmits(['update-subtitle', 'update-file', 'extract-subtitles', 'hover-subtitle'])

const loadSubtitles = async filename => {
  try {
    const { data } = await $apiService.sendMessage('load-subtitles', {
      filename,
      isPath: true,
    })
    emit('update-file', filename)
    emit('update-subtitle', parseSubtitles(data))
  } catch (error) {
    $error.message = error?.response?.data?.error || ''
  }
}

function extractSubtitles() {
  extracting.value = true
  emit('extract-subtitles')
}

function updateSubtitle(subtitle) {
  emit('update-subtitle', subtitle)
}

const subtitleRows = computed(() => {
  if (props.subtitles.length < props.rows) {
    return [
      ...props.subtitles,
      ...Array(props.rows - props.subtitles.length).fill({
        start: '',
        end: '',
        text: '',
      }),
    ]
  }
  return props.subtitles
})

const headers = reactive([
  { title: 'Start', value: 'start', align: 'center' },
  { title: 'End', value: 'end', align: 'center' },
  { title: 'Subtitle text', value: 'text', align: 'center' },
])
const actions = reactive([
  { name: 'save', icon: 'mdi-content-save', method: () => {}, hasPopup: false },
  { name: 'edit', icon: 'mdi-pencil', method: () => {}, hasPopup: true },
  { name: 'close', icon: 'mdi-close', method: () => {}, hasPopup: false },
])

onMounted(() => {
  if (props.file && !props.subtitles.length) {
    loadSubtitles(props.file)
  }
})
watch(
  () => props.subtitles,
  newSubtitles => {
    if (extracting.value && newSubtitles.length > 0) {
      emit('update-file', 'Extracted subtitles')
      extracting.value = false
    }
  },
  { deep: true },
)
</script>
<template>
  <div
    v-if="!file"
    class="wrapper"
    :class="{ container_button: !hasVideo, 'd-flex': hasVideo, 'pa-0': hasVideo }"
  >
    <div
      class="d-flex align-center flex-column ma-auto w-100 h-100 justify-center"
      :style="`${hasVideo ? 'border-radius: 20px 0 0 20px' : ''}`"
      :class="{ container_button: hasVideo }"
      @click="$refs.fileInput.click()"
    >
      <v-icon style="font-size: 78px">mdi-upload</v-icon>
      <span style="font-size: 24px">Open Subtitles</span>
    </div>
    <div
      class="d-flex align-center flex-column ma-auto container_button w-100 h-100 justify-center"
      style="border-radius: 0 20px 20px 0"
      v-if="hasVideo"
      @click="extractSubtitles"
    >
      <v-icon style="font-size: 78px">mdi-file-export</v-icon>
      <span style="font-size: 24px">Extract Subtitles</span>
    </div>
  </div>
  <div
    v-else
    class="sub-table_wrapper position-relative"
    @mouseover="hovered = true"
    @mouseleave="hovered = false"
  >
    <ActionMenu
      style="padding: 0.5rem 0.25rem"
      :options="actions"
      :active="hovered || menuOpen"
      @open="
        data => {
          if (data === undefined) return
          menuOpen = data
        }
      "
    >
      <template #left>
        <FileVariantManager
          :currentFile="file"
          type="subtitles"
          @update:variant="loadSubtitles"
        />
      </template>
      <template #popup="{ item }">
        <FileManager
          v-if="item.name === 'edit'"
          :currentFile="file"
          type="subtitles"
          @update:current-file="loadSubtitles"
        />
      </template>
    </ActionMenu>
    <div
      class="sub-table d-flex flex-column ga-1"
      style="padding: 2.5rem 0 1rem 0"
    >
      <div
        class="sub-table_row d-flex w-100"
        :class="{ 'sub-table_row_active': item.active && item.id !== undefined }"
        v-for="item in subtitleRows"
        :key="item.id"
        @mouseover="
          () => {
            $emit('hover-subtitle', item.id)
            item.active = true
          }
        "
        @mouseleave="() => (item.active = false)"
      >
        <input
          class="sub-table_cell"
          v-for="header in headers"
          :key="header.value"
          :style="{
            flexGrow: header.title === 'Subtitle text' ? 1 : 0,
            maxWidth: header.title === 'Subtitle text' ? '20rem' : '6rem',
          }"
          :disabled="item.id === undefined"
          v-model="item[header.value]"
          @input="updateSubtitle(subtitles)"
        />
      </div>
    </div>
  </div>
</template>
<style scoped lang="scss">
.subtitle-table {
  max-width: 600px;
  margin: 0 auto;
}
input:focus {
  outline: none;
  border: none;
}
.sub-table {
  background-color: var(--clr-background);
  border: 2px var(--clr-white) solid;
  border-radius: 20px;
  padding: 0.5rem;
  --clr-cell: var(--clr-white);
  &_cell {
    color: var(--clr-cell);
    text-align: center;
    display: inline-block;
    flex-shrink: 0;
    flex-basis: 0;
  }
  &_row_active {
    background-color: var(--clr-primary);
    --clr-cell: var(--clr-white) !important;
  }
}
</style>
