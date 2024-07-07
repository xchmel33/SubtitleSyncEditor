<script setup lang="js">
import ActionMenu from '@/components/lib/ActionMenu.vue'
import FileManager from '@/components/FileManager.vue'
import { parseSubtitles, formatSubtitles } from '@/utilities/subtitles'
import { ref, computed, getCurrentInstance, onMounted, reactive } from 'vue'
import FileVariantManager from '@/components/FileVariantManager.vue'
import SubtitleTable from '@/components/SubtitleTable.vue'

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
  activeSubtitle: { Object, default: () => null },
  testPrefix: { String, default: '' },
})

const hovered = ref(false)
const menuOpen = ref(false)
const emit = defineEmits([
  'update-subtitle',
  'update-subtitles',
  'update-file',
  'extract-subtitles',
  'hover-subtitle',
  'activate-subtitle',
  'add-subtitle',
  'delete-subtitle',
  'play-subtitle',
])

const loadSubtitles = async filename => {
  try {
    const { data } = await $apiService.sendMessage('load-subtitles', {
      filename,
      isPath: true,
    })
    const parsed = parseSubtitles(data)
    emit('update-file', filename)
    emit('update-subtitles', parsed)
  } catch (error) {
    $error.message = error?.response?.data?.error || ''
  }
}

const closeSubtitles = () => {
  emit('update-file', '')
  emit('update-subtitles', [])
}

const saveSubtitles = async () => {
  try {
    const { data } = await $apiService.sendMessage('save-file-dialog', {
      defaultName: 'new_subtitles.srt',
      defaultExtensions: ['srt', 'vtt'],
    })
    const { filePath } = data
    if (!filePath) return
    await $apiService.sendMessage('save-subtitles', {
      filename: filePath,
      subtitles: formatSubtitles(props.subtitles),
    })
    emit('update-file', filePath)
  } catch (error) {
    $error.message = error?.response?.data?.error || ''
  }
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
const getActions = () => [
  {
    name: 'extract',
    tooltip: 'Extract subtitles from video',
    icon: 'mdi-export',
    rotate: 90,
    method: () => emit('extract-subtitles'),
    condition: props.hasVideo,
    hasPopup: false,
  },
  {
    name: 'save',
    tooltip: 'Save subtitles',
    icon: 'mdi-content-save',
    condition: props.subtitles.length > 0,
    method: saveSubtitles,
    hasPopup: false,
  },
  {
    name: 'edit',
    tooltip: `${props.file ? 'Change' : 'Open'} file`,
    icon: `${props.file ? 'mdi-pencil-plus' : 'mdi-file-plus'}`,
    method: () => {},
    hasPopup: true,
  },
  {
    name: 'close',
    tooltip: 'Close file',
    icon: 'mdi-close',
    condition: props.file || props.subtitles.length > 0,
    method: closeSubtitles,
    hasPopup: false,
  },
]

onMounted(() => {
  if (props.file && !props.subtitles.length) {
    loadSubtitles(props.file)
  }
})
</script>
<template>
  <div
    :data-test="testPrefix"
    class="table_wrapper position-relative"
    @mouseover="hovered = true"
    @mouseleave="hovered = false"
  >
    <ActionMenu
      :testPrefix="testPrefix"
      style="padding: 0.5rem 0.25rem"
      :options="getActions().filter(action => action.condition === undefined || action.condition)"
      :active="true"
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
          @keep-menu-open="menuOpen = $event"
        />
      </template>
      <template #popup="{ item }">
        <FileManager
          ref="fileManager"
          v-if="item.name === 'edit'"
          :currentFile="file"
          type="subtitles"
          @update:current-file="loadSubtitles"
        />
      </template>
    </ActionMenu>
    <SubtitleTable
      :test-prefix="testPrefix"
      :subtitles="subtitleRows"
      :activeSubtitleProp="props.activeSubtitle"
      @activate-subtitle="$emit('activate-subtitle', $event)"
      @hover-subtitle="$emit('hover-subtitle', $event)"
      @update-subtitle="$emit('update-subtitle', $event)"
      @update-file="$emit('update-file', $event)"
      @extract-subtitles="$emit('extract-subtitles')"
      @add-subtitle="$emit('add-subtitle', $event)"
      @delete-subtitle="$emit('delete-subtitle', $event)"
      @play-subtitle="$emit('play-subtitle', $event)"
    />
  </div>
</template>
<style scoped lang="scss"></style>
