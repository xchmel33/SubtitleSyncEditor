<script setup>
import VideoPlayer from '@/components/VideoPlayer.vue'
import SubtitleContainer from '@/components/SubtitleContainer.vue'
import { formatSubtitles } from '@/utilities/subtitles'
import { getCurrentInstance, ref, watch } from 'vue'
import { getFilename } from '@/utilities/helpers'
import { handleKeyCombination } from '@/utilities/listeners'
import ActionBtn from '@/components/lib/ActionBtn.vue'

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
  index: {
    type: Number,
    default: 0,
  },
  maxSubtitles: {
    type: Number,
    default: 0,
  },
  isLast: {
    type: Boolean,
    default: false,
  },
  concurrentEditing: {
    type: Object,
    default: () => ({
      text: false,
      time: false,
    }),
  },
})

const localConcurrentEditing = ref(props.concurrentEditing)

const emit = defineEmits([
  'update:videoFile',
  'update:time',
  'update:subtitle',
  'update:subtitleFile',
  'update:subtitles',
  'extract-subtitles',
  'hover-subtitle',
  'activate-subtitle',
  'concurrent-editing',
  'add-subtitle',
  'delete-subtitle',
])

// const contentContainer = ref(null)

const embedSubtitlesToVideo = async () => {
  try {
    let filePath = ''
    if (!window.location.href.includes('test')) {
      const { data } = await $apiService.sendMessage('save-file-dialog', {
        defaultName: getFilename(props.item.videoFile),
        defaultExtensions: [props.item.videoFile.split('.').pop()],
      })
      filePath = data.filePath
    } else {
      filePath = `./tests/data/${getFilename(props.item.videoFile)}`
    }
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

const hasConcurrentEditing = () => {
  return props.concurrentEditing.text || props.concurrentEditing.time
}

watch(props.concurrentEditing, () => {
  localConcurrentEditing.value = props.concurrentEditing
})
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
        style="height: 35%"
        :file="item.videoFile"
        :subtitleRows="item.subtitleRows"
        :testPrefix="`video_player_${index}`"
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
        :testPrefix="`subtitle_container_${index}`"
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
      style="position: absolute; right: 0; top: 32%; transform: translateX(66%); z-index: 1"
      v-if="item.videoFile && !isLast"
    >
      <ActionBtn
        icon="mdi-link"
        testPrefix="concurrentEditing"
        :has-popup="true"
        :has-overlay="false"
      >
        <template #opener>
          <v-tooltip
            location="top"
            :text="`${!hasConcurrentEditing() ? 'Enable' : 'Disable'} concurrent subtitle edit`"
          >
            <template v-slot:activator="{ props }">
              <v-btn
                v-bind="props"
                icon
                small
                style="border: 1px solid white"
                :class="`icon_button_link${hasConcurrentEditing() ? '_active' : ''}`"
                ><v-icon color="white">mdi-link</v-icon></v-btn
              >
            </template>
          </v-tooltip>
        </template>
        <template #popup="{ methods }">
          <div class="d-flex flex-column pa-4 ga-2">
            <div class="d-flex justify-start ga-1">
              <input
                type="checkbox"
                v-model="localConcurrentEditing.text"
              />
              <label>Edit text</label>
            </div>
            <div class="d-flex justify-start ga-1">
              <input
                type="checkbox"
                v-model="localConcurrentEditing.time"
              />
              <label>Re-time</label>
            </div>
            <button
              class="text_button px-4 pa-1"
              @click="
                () => {
                  methods.toggleOpen(false)
                  $emit('concurrent-editing', localConcurrentEditing)
                }
              "
            >
              Confirm
            </button>
          </div>
        </template>
      </ActionBtn>
    </div>
  </div>
</template>

<style scoped lang="scss">
:deep(.v-overlay__content) {
  transform: translateY(25%);
  transition: all ease-in-out 0.5s;
}
</style>
