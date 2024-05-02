<script setup lang="js">
import { onMounted, ref, getCurrentInstance, watch } from 'vue'
import { getFilename } from '@/utilities/helpers'

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
    props.currentFile &&
    (!recentFiles.value.length ||
      !recentFiles.value.map(file => file.path).includes(props.currentFile))
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

// const testLotsOfFiles = () => {
//   return Array.from({ length: 50 }, (_, i) => i).map(i => ({
//     path: `file${i}.txt`,
//     type: 'subtitles',
//     variants: [],
//   }))
// }
</script>

<template>
  <div
    class="wrapper"
    style="width: 300px"
  >
    <div
      class="d-flex ga-2 align-center"
      style="color: white"
    >
      <span>Selected file:</span>
      <span
        style="font-size: 0.9rem"
        class="inner_container flex-1-1"
        >{{ getFilename(currentFile || 'No file selected') }}</span
      >
    </div>
    <div class="text-start mt-2">
      <span>Recent files:</span>
      <div class="mt-1 inner_container inner_container_white">
        <perfect-scrollbar
          @wheel="handleScroll"
          @scroll="handleScroll"
        >
          <div
            v-for="file in recentFiles.filter(file => file.path !== currentFile && file.path)"
            :key="file"
          >
            <button
              class="text_button_small text-left"
              style="width: 95%"
              @mouseover="$event.target.classList.add('text_button')"
              @mouseleave="$event.target.classList.remove('text_button')"
              @click="$emit('update:current-file', file.path)"
            >
              {{ getFilename(file.path) }}
            </button>
          </div>
        </perfect-scrollbar>
      </div>
    </div>
    <div>
      <button
        class="text_button mt-2 w-100"
        @click="fileDialog"
      >
        Open new file
      </button>
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
:deep(.ps__thumb-y) {
  background-color: var(--clr-background) !important;
  opacity: 1;
}
</style>
