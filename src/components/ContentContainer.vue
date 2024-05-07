<script setup>
import VideoPlayer from '@/components/VideoPlayer.vue'
import SubtitleContainer from '@/components/SubtitleContainer.vue'
import { formatSubtitles } from '@/utilities/subtitles'
import { getCurrentInstance } from 'vue'
import { getFilename } from '@/utilities/helpers'
import { handleKeyCombination } from '@/utilities/listeners'

const { $apiService, $error } = getCurrentInstance().appContext.config.globalProperties

const props = defineProps({
  item: {
    type: Object,
    default: () => ({
      id: -1,
      videoFile: '',
      subtitleFile: '',
      subtitleRows: [],
      sync: false,
    }),
  },
  maxSubtitles: {
    type: Number,
    default: 0,
  },
  isLast: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([
  'update:videoFile',
  'update:time',
  'update:subtitle',
  'update:subtitleFile',
  'update:subtitles',
  'extract-subtitles',
  'hover-subtitle',
  'activate-subtitle',
  'match-subtitles',
  'add-subtitle',
  'delete-subtitle',
])

// const contentContainer = ref(null)

const embedSubtitlesToVideo = async () => {
  try {
    const { data } = await $apiService.sendMessage('save-file-dialog', {
      defaultName: getFilename(props.item.videoFile),
      defaultExtensions: [props.item.videoFile.split('.').pop()],
    })
    const { filePath } = data
    const tmpSubtitleFile = `${filePath}_tmp.srt`
    if (!filePath) return
    await $apiService.sendMessage('save-subtitles', {
      filename: tmpSubtitleFile,
      subtitles: formatSubtitles(props.item.subtitleRows),
    })
    await $apiService.sendMessage('embed-subtitles', {
      inputFilePath: props.item.videoFile,
      subtitles: tmpSubtitleFile,
      outputFilePath: filePath,
    })
  } catch (error) {
    $error.message = error?.response?.data?.error || ''
  }
}
const playVideo = () => {
  console.log('Play video')
  document.getElementById(`video_player_${props.item.videoFile}`).play()
}
const pauseVideo = () => {
  console.log('Pause video')
  document.getElementById(`video_player_${props.item.videoFile}`).pause()
}
const handlePlayFromSubtitle = start => {
  console.log(`Pause from ${start}`)
  const video = document.getElementById(`video_player_${props.item.videoFile}`)
  video.currentTime = start
}
</script>

<template>
  <div
    class="d-flex position-relative no-focus-outline"
    tabindex="0"
    @keydown="
      e => {
        handleKeyCombination({ e, targetKey: 'w', callback: playVideo })
        handleKeyCombination({ e, targetKey: 's', callback: pauseVideo })
      }
    "
  >
    <div class="w-100 d-flex flex-column">
      <VideoPlayer
        style="height: 30%"
        :file="item.videoFile"
        :subtitleRows="item.subtitleRows"
        @update:file="$emit('update:videoFile', $event)"
        @update:time="$emit('update:time', $event)"
        @embed:subtitles="embedSubtitlesToVideo"
      />
      <SubtitleContainer
        style="height: 65%"
        :rows="maxSubtitles"
        :subtitles="item.subtitleRows"
        :has-video="!!item.videoFile"
        :file="item.subtitleFile"
        :activeSubtitle="item.active"
        @update-file="$emit('update:subtitleFile', $event)"
        @update-subtitles="$emit('update:subtitles', $event)"
        @update-subtitle="$emit('update:subtitle', $event)"
        @extract-subtitles="$emit('extract-subtitles')"
        @hover-subtitle="$emit('hover-subtitle', $event)"
        @activate-subtitle="$emit('activate-subtitle', $event)"
        @add-subtitle="$emit('add-subtitle', $event)"
        @delete-subtitle="$emit('delete-subtitle', $event)"
        @play-subtitle="handlePlayFromSubtitle"
      />
    </div>
    <div
      style="position: absolute; right: 0; top: 27.5%; transform: translateX(66%); z-index: 1"
      v-if="item.videoFile && !isLast"
    >
      <v-tooltip
        location="top"
        :text="`${!item.sync ? 'Enable' : 'Disable'} concurrent subtitle edit`"
      >
        <template v-slot:activator="{ props }">
          <v-btn
            v-bind="props"
            icon
            small
            style="border: 1px solid white"
            :class="`icon_button_link${item.sync ? '_active' : ''}`"
            @click="$emit('match-subtitles')"
            ><v-icon color="white">mdi-link</v-icon></v-btn
          >
        </template>
      </v-tooltip>
    </div>
  </div>
</template>

<style scoped lang="scss">
:deep(.v-overlay__content) {
  transform: translateY(25%);
  transition: all ease-in-out 0.5s;
}
</style>
