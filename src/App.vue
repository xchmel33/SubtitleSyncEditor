<script setup>
import { sessionLoader } from '@/utilities/session'
import { computed, ref, watch, getCurrentInstance, onMounted } from 'vue'
import {
  compareSubtitlesByText,
  compareSubtitlesByTime,
  parseSubtitles,
} from '@/utilities/subtitles'
import ContentContainer from '@/components/ContentContainer.vue'
import WaveContainer from '@/components/WaveContainer.vue'
import ErrorBox from '@/components/ErrorBox.vue'
import { addListeners, handleKeyCombination } from '@/utilities/listeners'
import { uniqueId } from '@/utilities/helpers'
import LoaderSpinner from '@/components/LoaderSpinner.vue'

const { $apiService, $error, $loading } = getCurrentInstance().appContext.config.globalProperties

const { session, undo, redo } = sessionLoader(['hover', 'active', 'match', 'merge', 'currentTime'])
const hoveredSubtitles = ref([])
const errorMessage = ref('')
const loadingMessage = ref('')

const maxSubtitles = computed(() => {
  return Math.max(...session.value.data.map(x => x?.length || 0))
})
const handleSubtitlesUpdate = (subtitles, idx) => {
  session.value.data[idx].subtitleRows = subtitles
}
const handleSubtitleUpdate = ({ item, index }, idx) => {
  session.value.data[idx].subtitleRows[index] = item
  const offset = session.value.data[idx].offsetMs || 0
  if (!session.value.data[idx].sync) return
  if (item.match) {
    const { subtitleId, videoId } = item.match
    const matchedSubtitle = session.value.data[videoId].subtitleRows[subtitleId]
    matchedSubtitle.text = item.text
    matchedSubtitle.start = item.start + offset
    matchedSubtitle.end = item.end + offset
  }
}
const handleHoverSubtitle = (subtitleIdx, videoIdx) => {
  if (!session.value.data[videoIdx].sync) return
  hoveredSubtitles.value.forEach(subtitle => (subtitle.hover = false))
  if (session.value.data[videoIdx].subtitleRows[subtitleIdx].match) {
    const { subtitleId, videoId } = session.value.data[videoIdx].subtitleRows[subtitleIdx].match
    session.value.data[videoId].subtitleRows[subtitleId].hover = true
    hoveredSubtitles.value.push(session.value.data[videoId].subtitleRows[subtitleId])
  }
}
const addSubtitle = (subtitle, idx) => {
  const subtitleToAdd = {
    start: 0,
    end: 1000,
    text: 'Hello',
    id: uniqueId(),
  }
  if (!subtitle) {
    session.value.data[idx].subtitleRows.push(subtitleToAdd)
    return
  }
  const index = session.value.data[idx].subtitleRows.findIndex(x => x.id === subtitle.id)
  session.value.data[idx].subtitleRows.splice(index + 1, 0, subtitleToAdd)
}
const deleteSubtitle = (subtitle, idx) => {
  const index = session.value.data[idx].subtitleRows.findIndex(x => x.id === subtitle.id)
  session.value.data[idx].subtitleRows.splice(index, 1)
}
const activateSubtitle = (subtitle, idx) => {
  session.value.data.forEach(x => {
    x.subtitleRows.forEach(y => (y.active = false))
  })
  subtitle.active = true
  if (session.value.data[idx].sync && subtitle.match) {
    const { subtitleId, videoId } = subtitle.match
    session.value.data[videoId].subtitleRows[subtitleId].active = true
  }
}

const isTimeAligned = index => {
  const x = session.value.data[index]
  return x?.offset && x.offset !== 0
}
const matchSubtitles = index => {
  if (session.value.data[index].sync) {
    session.value.data[index].sync = false
    return
  }
  const toMatchIndex = index === session.value.data.length - 1 ? index - 1 : index + 1
  let match
  if (isTimeAligned(index)) {
    match = compareSubtitlesByTime({
      subtitles1: session.value.data[index],
      subtitles2: session.value.data[toMatchIndex],
      index,
      toMatchIndex,
    })
  } else {
    match = compareSubtitlesByText({
      subtitles1: session.value.data[index].subtitleRows,
      subtitles2: session.value.data[toMatchIndex].subtitleRows,
      index,
      toMatchIndex,
    })
  }
  if (match) session.value.data[index].sync = true
}
const extractSubtitles = async index => {
  try {
    const { data } = await $apiService.sendMessage('extract-subtitles', {
      file: session.value.data[index].videoFile,
    })
    if (data && !data.error) {
      session.value.data[index].subtitleRows = parseSubtitles(data)
    } else {
      errorMessage.value = data.error
    }
  } catch (error) {
    errorMessage.value = error?.response?.data?.error || ''
  }
}
const addVideoFile = async (e, i) => {
  session.value.data[i].videoFile = e.localPath || e.path || e
}
const handleAlignmentUpdate = ({ index, offset, offsetMs }) => {
  session.value.data[index].offset = offset
  session.value.data[index].offsetMs = offsetMs
}
const handleSetTimeTo = (time, idx) => {
  console.log('Set time to', time)
  const videoElement = document.getElementById(`video_player_${session.value.data[idx].videoFile}`)
  if (videoElement) {
    videoElement.currentTime = time
  }
}
watch(errorMessage, value => {
  if (value) {
    setTimeout(() => {
      $error.message = ''
      errorMessage.value = ''
    }, 5000)
  }
})
watch($error, value => {
  if (value) {
    errorMessage.value = value.message
  }
})
watch($loading, value => {
  if (value) {
    loadingMessage.value = value.message
  }
})
onMounted(() => {
  addListeners([
    {
      e: 'keydown',
      fn: e => handleKeyCombination({ e, targetKey: 'z', ctrl: true, callback: undo }),
    },
    {
      e: 'keydown',
      fn: e => handleKeyCombination({ e, targetKey: 'y', ctrl: true, callback: redo }),
    },
  ])
})
</script>

<template>
  <div class="d-flex ga-4">
    <ContentContainer
      style="height: 70vh"
      class="flex-1-1"
      v-for="(item, idx) in session.data"
      :key="item.id"
      :item="item"
      :maxSubtitles="maxSubtitles"
      :is-last="idx === session.data.length - 1"
      @update:videoFile="e => addVideoFile(e, idx)"
      @update:subtitleFile="session.data[idx].subtitleFile = $event"
      @update:subtitles="handleSubtitlesUpdate($event, idx)"
      @update:subtitle="handleSubtitleUpdate($event, idx)"
      @update:time="session.data[idx].currentTime = $event"
      @extract-subtitles="() => extractSubtitles(idx)"
      @hover-subtitle="handleHoverSubtitle($event, idx)"
      @match-subtitles="() => matchSubtitles(idx)"
      @activate-subtitle="activateSubtitle($event, idx)"
      @add-subtitle="addSubtitle($event, idx)"
      @delete-subtitle="deleteSubtitle($event, idx)"
    />
  </div>
  <WaveContainer
    :waveforms="session.data"
    :zoomLevel="session.zoomLevel"
    :wsStartPos="session.wsStartPos"
    @update:zoom="session.zoomLevel = $event"
    @update:wsStart="session.wsStartPos = $event"
    @update:offset="handleAlignmentUpdate"
    @update:subtitle="handleSubtitleUpdate($event.unwrap, $event.idx)"
    @update:subtitles="handleSubtitlesUpdate($event.unwrap, $event.idx)"
    @add-subtitle="addSubtitle($event.unwrap, $event.idx)"
    @delete-subtitle="deleteSubtitle($event.unwrap, $event.idx)"
    @set-time-to="handleSetTimeTo($event.unwrap, $event.idx)"
  />
  <ErrorBox
    :error="errorMessage"
    @update:error="errorMessage = $event"
  />
  <LoaderSpinner :text="loadingMessage" />
</template>

<style>
#app {
  padding: 0.5rem !important;
  max-width: 100vw !important;
}
html {
  overflow-y: hidden !important;
}
</style>
