<script setup lang="js">
import { onMounted, ref, getCurrentInstance, computed } from 'vue'
import { getFilename, sortByTimestamps, timestamp } from '@/utilities/helpers'
import ActionBtn from '@/components/lib/ActionBtn.vue'

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

const getCwd = async () => {
  return (await $apiService.sendMessage('cwd', {}, { method: 'GET' })).data?.cwd || ''
}

const getFiles = async () => {
  const cwd = await getCwd()
  $apiService
    .sendMessage('get-files', {}, { method: 'GET' })
    .catch(error => {
      $error.message = error?.response?.data?.error || ''
    })
    .then(({ data }) => {
      if (data.length === 0) {
        return
      }
      recentFiles.value = sortByTimestamps(
        data
          .filter(file => {
            // const isLocalFile = file.path.startsWith('videos')
            return (
              file.type === props.type && 1
              // (isElectron.value ? !isLocalFile : isLocalFile || file.type === 'subtitles')
            )
          })
          .map(x => {
            x.hovered = false
            return isElectron.value || x.type === 'subtitles'
              ? x
              : { ...x, path: x.path.replace(cwd, '') }
          }),
      )
      console.log('Fetched files:', recentFiles.value)
    })
}

onMounted(async () => {
  await getFiles()
})

const saveFile = async path => {
  if (!isElectron.value && props.type !== 'subtitles') {
    const cwd = await getCwd()
    path = path.replace(cwd, '')
  }
  if (path === 'No file selected') return
  const file = { path, type: props.type, variants: [], time: timestamp() }
  const { data } = await $apiService.sendMessage('save-file', { file }, {}).catch(error => {
    $error.message = error?.response?.data?.error || ''
  })
  if (data.status === 'ok' || data.saved) await getFiles()
}
const saveFiles = async files => {
  await files.reduce(async (previousPromise, file) => {
    await previousPromise
    return saveFile(file.path || file)
  }, Promise.resolve())
}

const emit = defineEmits(['update:current-file'])
const handleScroll = event => {
  event.stopPropagation()
  event.preventDefault()
}
const addFile = async () => {
  const { data } = await $apiService.sendMessage('open-file-dialog', { type: props.type }, {})
  if (!data) {
    $error.message = 'No file selected'
    return
  }
  await saveFile(data.path)
}
const addFiles = async () => {
  const { data } = await $apiService.sendMessage('open-files-dialog', { type: props.type }, {})
  if (!data) {
    $error.message = 'No files selected'
    return
  }
  await saveFiles(data.files)
}
const addFolder = async () => {
  const { data } = await $apiService.sendMessage('open-folder-dialog', { type: props.type }, {})
  if (!data) {
    $error.message = 'No folder selected'
    return
  }
  await saveFiles(data.files)
}

const openFile = async path => {
  await $apiService.sendMessage('open-file', { path, time: timestamp() }, {})
  emit('update:current-file', path)
}

const closeFile = async file => {
  await $apiService.sendMessage('close-file', { id: file.id }, {})
  await getFiles()
}

const openButtons = [
  {
    id: 'file',
    text: 'Open file',
    action: addFile,
  },
  {
    id: 'folder',
    text: 'Open folder',
    action: addFolder,
  },
  {
    id: 'files',
    text: 'Open files',
    action: addFiles,
  },
]
</script>

<template>
  <div
    class="wrapper"
    style="width: 600px"
  >
    <div
      class="d-flex ga-1 align-center"
      style="color: white"
    >
      <span style="width: 17%; text-align: left">Selected file:</span>
      <span
        style="width: 75%; font-size: 0.8rem; text-align: center"
        class="inner_container truncate_left flex-1-1"
        >{{ currentFile || 'No file selected' }}</span
      >
    </div>
    <div class="text-start mt-2">
      <span class="text-left">Recent files:</span>
      <div class="mt-1 inner_container inner_container_white">
        <perfect-scrollbar
          @wheel="handleScroll"
          @scroll="handleScroll"
        >
          <div
            class="d-flex align-center"
            v-for="file in recentFiles.filter(f => !props.blacklist.includes(f.path))"
            :key="file"
            @mouseover="file.hovered = true"
            @mouseleave="file.hovered = false"
          >
            <button
              class="text_button_small text-left d-flex justify-space-between"
              style="width: 92.5%; outline: none"
              :data-test="`file_manager_file_${getFilename(file.path)}`"
              @click="async () => await openFile(file.path)"
            >
              <span
                style="max-width: 65%"
                class="truncate_left"
                >{{ getFilename(file.path) }}</span
              >
              <span>{{ file.time || '' }}</span>
            </button>
            <ActionBtn
              v-if="file.hovered"
              style="width: 1.25rem; height: 1.25rem"
              class="d-flex my-auto ml-1"
              icon="mdi-close"
              size="mini"
              bgColor="red"
              @click="closeFile(file)"
            ></ActionBtn>
          </div>
        </perfect-scrollbar>
      </div>
    </div>
    <div class="d-flex ga-2 justify-end">
      <button
        v-for="button in openButtons"
        :data-test="`file_manager_open_${button.id}`"
        class="text_button mt-3 px-4"
        @click="button.action"
      >
        {{ button.text }}
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
