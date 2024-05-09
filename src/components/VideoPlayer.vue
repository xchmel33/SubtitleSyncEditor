<script setup lang="js">
import { ref, onMounted, watch, getCurrentInstance } from 'vue'
import { getFilename } from '@/utilities/helpers'
import ActionMenu from '@/components/lib/ActionMenu.vue'
import FileManager from '@/components/FileManager.vue'
import SubtitlePreview from '@/components/SubtitlePreview.vue'
import { throttle } from 'lodash'

const { $update } = getCurrentInstance().appContext.config.globalProperties
const emits = defineEmits(['update:time', 'update:file', 'embed:subtitles', 'update:active'])
const props = defineProps({
  file: String,
  subtitleRows: Object,
})

const time = ref(0)
const menuOpen = ref(false)
const hovered = ref(false)
const videoPlayer = ref(null)
const playedSubtitle = ref(null)
const playedSubtitleTransform = ref(false)
const getActions = () => [
  {
    name: 'save',
    tooltip: 'Embed subtitles to video',
    icon: 'mdi-content-save-plus',
    condition: props.file && props.subtitleRows.length,
    method: () => emits('embed:subtitles'),
  },
  {
    name: 'edit',
    tooltip: `${props.file ? 'Change' : 'Open'} video file`,
    icon: `${props.file ? 'mdi-pencil-plus' : 'mdi-file-plus'}`,
    method: () => {},
    hasPopup: true,
  },
  {
    name: 'close',
    tooltip: 'Close video file',
    condition: props.file,
    icon: 'mdi-close',
    method: () => emits('update:file', ''),
  },
]

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

const drawSubtitle = () => {
  playedSubtitle.value = null
  if (!props.subtitleRows.length) return
  playedSubtitle.value = props.subtitleRows.find(
    x => x.start <= time.value * 1000 && time.value * 1000 <= x.end,
  )
}

onMounted(() => {
  setVideoTime()
  startPolling()
})

watch(() => time.value, throttle(drawSubtitle, 150))
watch(
  () => $update.targets,
  () => drawSubtitle(),
  { deep: true },
)
const startPolling = () => {
  const poll = () => {
    handleTimeUpdate()
    requestAnimationFrame(poll)
  }
  requestAnimationFrame(poll)
}
const handlePlay = () => {
  setTimeout(() => (playedSubtitleTransform.value = true), 200)
}
</script>
<template>
  <div
    class="wrapper mb-4 d-flex ga-4"
    style="padding: 0 !important"
    @mouseover="hovered = true"
    @mouseleave="hovered = false"
  >
    <ActionMenu
      :options="getActions().filter(x => x.condition === undefined || x.condition)"
      :active="hovered || menuOpen"
      style="z-index: 99"
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
    <div class="d-flex position-relative">
      <video
        ref="videoPlayer"
        :id="`video_player_${file}`"
        height="100%"
        style="border-radius: 20px"
        :src="file"
        :key="file"
        @timeupdate="handleTimeUpdate"
        @play="handlePlay"
        @pause="playedSubtitleTransform = false"
        controls
        muted
      ></video>
      <transition
        name="fade"
        appear
      >
        <div
          v-if="playedSubtitle"
          class="subtitle-overlay d-flex"
          :style="playedSubtitleTransform && !hovered ? { transform: 'translateY(3rem)' } : {}"
        >
          <span class="subtitle-overlay-content">{{ playedSubtitle.text }}</span>
        </div>
      </transition>
    </div>
    <SubtitlePreview :subtitleRows="subtitleRows" />
  </div>
</template>

<style scoped>
.subtitle-overlay {
  position: absolute;
  bottom: 4rem;
  z-index: 99;
  width: 100%;
  transition: transform ease 0.2s;
}
.subtitle-overlay-content {
  color: white;
  background: rgba(50, 50, 50, 0.9);
  margin: auto;
  padding: 0.1rem 0.5rem;
  border-radius: 0.5rem;
  font-size: 0.85rem;
}
.ss_icon {
  min-width: 20px;
  height: 20px;
  padding: 2px;
  border-radius: 4px;
}
.wrapper {
  height: 53%;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.fade-enter-active {
  transition: opacity 0.5s ease;
}
.fade-enter-to,
.fade-leave-from {
  opacity: 1;
}
</style>
