<script setup lang="js">
import { onMounted, ref, getCurrentInstance, watch, computed } from 'vue'
import { getFilename, sortByTimestamps, timestamp } from '@/utilities/helpers'

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
  blacklist: {
    type: Array,
    default: () => [],
  },
})
const recentFiles = ref([])
const isElectron = computed(() => typeof window.electron !== 'undefined')

const updateRecentFiles = async () => {
  // console.log('updateRecentFiles', props.currentFile, recentFiles.value)
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
      recentFiles.value = sortByTimestamps(
        data.filter(file => {
          const isLocalFile = file.path.startsWith('videos')
          return (
            file.type === props.type &&
            (isElectron.value ? !isLocalFile : isLocalFile || file.type === 'subtitles')
          )
        }),
      )
    })
    .then(async () => updateRecentFiles())
}

onMounted(async () => {
  await getFiles()
})

watch(
  () => props.currentFile,
  async () => updateRecentFiles(props.currentFile),
)

const handleAddFile = async path => {
  if (path === 'No file selected') return
  const file = { path, type: props.type, variants: [], time: timestamp() }
  const { data } = await $apiService.sendMessage('save-file', { file }, {}).catch(error => {
    $error.message = error?.response?.data?.error || ''
  })
  if (data.saved) await getFiles()
}

const emit = defineEmits(['update:current-file'])
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
  await handleOpenFile(data.path)
}

const handleOpenFile = async path => {
  await $apiService.sendMessage('open-file', { path, time: timestamp() }, {})
  emit('update:current-file', path)
}
</script>

<template>
  <div
    class="wrapper"
    style="width: 450px"
  >
    <div
      class="d-flex ga-1 align-center"
      style="color: white"
    >
      <span style="width: 22.5%">Selected file:</span>
      <span
        style="width: 75%; font-size: 0.8rem; direction: rtl; text-align: left"
        class="inner_container truncate flex-1-1"
        >{{ currentFile || 'No file selected' }}</span
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
            v-for="file in recentFiles.filter(f => !props.blacklist.includes(f.path))"
            :key="file"
          >
            <button
              class="text_button_small text-left d-flex justify-space-between"
              style="width: 95%; outline: none"
              @click="async () => await handleOpenFile(file.path)"
            >
              <span>{{ getFilename(file.path) }}</span>
              <span>{{ file.time || '' }}</span>
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
    </div>
  </div>
</template>

<style scoped>
.text_button_small:hover {
  background-color: var(--clr-background);
  color: white;
}
.ps {
  height: 150px;
}
:deep(.ps__thumb-y) {
  background-color: var(--clr-background) !important;
  opacity: 1;
}
</style>
