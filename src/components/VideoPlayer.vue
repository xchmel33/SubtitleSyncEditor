<script setup lang="js">
import { ref, onMounted } from 'vue'
import { getFilename } from '@/utilities/helpers'
import ActionMenu from '@/components/lib/ActionMenu.vue'
import FileManager from '@/components/FileManager.vue'
import SubtitlePreview from '@/components/SubtitlePreview.vue'

const emits = defineEmits(['update:time', 'update:file', 'embed:subtitles', 'update:active'])
const props = defineProps({
  file: String,
  subtitleRows: Object,
})

const time = ref(0)
const menuOpen = ref(false)
const hovered = ref(false)
const videoPlayer = ref(null)
const actions = ref([
  {
    name: 'save',
    tooltip: 'Embed subtitles to video',
    icon: 'mdi-content-save-plus',
    method: () => emits('embed:subtitles'),
  },
  {
    name: 'edit',
    tooltip: `${props.file ? 'Change' : 'Open'} video file`,
    icon: 'mdi-pencil',
    method: () => {},
    hasPopup: true,
  },
  {
    name: 'close',
    tooltip: 'Close video file',
    icon: 'mdi-close',
    method: () => emits('update:file', ''),
  },
])

const handlePickFile = file => {
  console.log('Picked file:', file)
  emits('update:file', file)
}

const setVideoTime = () => {
  if (!videoPlayer.value) return
  videoPlayer.value.currentTime = time.value
}

const handleTimeUpdate = () => {
  time.value = videoPlayer.value.currentTime
  emits('update:time', time.value)
}

onMounted(() => {
  setVideoTime()
  startPolling()
})

const startPolling = () => {
  const poll = () => {
    handleTimeUpdate()
    requestAnimationFrame(poll)
  }
  requestAnimationFrame(poll)
}
</script>
<template>
  <div
    class="wrapper mb-4 d-flex ga-4"
    @mouseover="hovered = true"
    @mouseleave="hovered = false"
  >
    <ActionMenu
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
        <span class="clr_white">{{ getFilename(file) }}</span>
      </template>
      <template #popup="{ item }">
        <FileManager
          v-if="item.name === 'edit'"
          :currentFile="file"
          type="video"
          @update:current-file="handlePickFile"
        />
      </template>
    </ActionMenu>
    <video
      ref="videoPlayer"
      :id="`video_player_${file}`"
      height="100%"
      style="border-radius: 20px"
      :src="file"
      :key="file"
      @timeupdate="handleTimeUpdate"
      controls
      muted
    />
    <SubtitlePreview :subtitleRows="subtitleRows" />
  </div>
</template>

<style scoped>
.ss_icon {
  min-width: 20px;
  height: 20px;
  padding: 2px;
  border-radius: 4px;
}
.wrapper {
  height: 53%;
}
</style>
