<script setup lang="js">
import { onMounted, ref, getCurrentInstance, watch } from 'vue'
import { getFilename } from '@/helpers'

const { $apiService, $error } = getCurrentInstance().appContext.config.globalProperties

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
const recentFiles = ref([])

const updateRecentFiles = async () => {
  if (
    !recentFiles.value.length ||
    !recentFiles.value.map(file => file.path).includes(props.currentFile)
  ) {
    await handleAddFile(props.currentFile)
  }
}

const getFiles = async () => {
  $apiService
    .sendMessage('get-files', {}, { method: 'GET' })
    .catch(error => {
      $error.message = error?.response?.data?.error || ''
    })
    .then(({ data }) => {
      if (data.length === 0) {
        $error.message = 'No files found'
        return
      }
      recentFiles.value = data.filter(file => file.type === props.type)
    })
    .then(async () => updateRecentFiles(props.currentFile))
}

onMounted(async () => {
  await getFiles()
})

watch(
  () => props.currentFile,
  async () => updateRecentFiles(props.currentFile),
)

const handleAddFile = async path => {
  const file = { path, type: props.type, variants: [] }
  await $apiService.sendMessage('save-file', { file }, {}).catch(error => {
    $error.message = error?.response?.data?.error || ''
  })
  await getFiles()
}

const emit = defineEmits(['update:current-file', 'open:new-file'])
const handleScroll = event => {
  event.stopPropagation()
  event.preventDefault()
}
const fileDialog = async () => {
  const { data } = await $apiService.sendMessage('open-file-dialog', { type: props.type }, {})
  if (!data) {
    $error.message = 'No file selected'
    return
  }
  emit('update:current-file', data.path)
}
</script>

<template>
  <div class="pa-4">
    <div
      class="d-flex ga-2 align-center"
      style="color: white"
    >
      <span>Selected file:</span>
      <span>{{ getFilename(currentFile) }}</span>
    </div>
    <div class="text-start">
      <span>Recent Files</span>
      <perfect-scrollbar
        @wheel="handleScroll"
        @scroll="handleScroll"
      >
        <div
          v-for="file in recentFiles"
          :key="file"
        >
          <button @click="$emit('update:current-file', file.path)">
            {{ getFilename(file.path) }}
          </button>
        </div>
      </perfect-scrollbar>
    </div>
    <div>
      <button @click="fileDialog">Add File</button>
      <input
        type="file"
        ref="fileInput"
        @change="$emit('open:new-file', $event)"
        hidden
      />
    </div>
  </div>
</template>

<style scoped>
.ps {
  height: 150px;
}
</style>
