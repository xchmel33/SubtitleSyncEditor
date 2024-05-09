<script setup>
import { sessionLoader } from '@/utilities/session'
import { computed, ref, watch, getCurrentInstance, onMounted, nextTick } from 'vue'
import {
  adjustSubtitleTimes,
  compareSubtitlesByText,
  compareSubtitlesByTime,
  parseSubtitles,
} from '@/utilities/subtitles'
import ContentContainer from '@/components/ContentContainer.vue'
import WaveContainer from '@/components/WaveContainer.vue'
import ErrorBox from '@/components/ErrorBox.vue'
import { addListeners, handleKeyCombination } from '@/utilities/listeners'
import { timestamp, uniqueId } from '@/utilities/helpers'
import LoaderSpinner from '@/components/LoaderSpinner.vue'

const { $apiService, $error, $loading, $update } =
  getCurrentInstance().appContext.config.globalProperties

const { session, undo, redo } = sessionLoader(['hover', 'active', 'match', 'merge', 'currentTime'])
const errorMessage = ref('')
const loadingMessage = ref({ message: '', stuck: false })

const maxSubtitles = computed(() => {
  return Math.max(...session.value.data.map(x => x?.length || 0))
})

// main subtitle updates
const handleSubtitlesUpdate = (subtitles, idx) => {
  session.value.data[idx].subtitleRows = subtitles
  if (subtitles.length)
    nextTick(() => {
      const scrollToId = `text_${session.value.data[idx].subtitleRows[0].id}`
      document.getElementById(scrollToId)?.scrollIntoView()
    })
  $update.targets.push({
    name: 'subtitles',
    target: null,
    idx,
  })
  console.log('Subtitles updated:', $update.target)
}
const handleSubtitleUpdate = ({ item, index }, idx) => {
  session.value.data[idx].subtitleRows[index] = item
  const offset = session.value.data[idx].offsetMs || 0
  $update.targets.push({
    name: 'subtitle-update',
    target: item,
    idx,
  })
  if (!session.value.data[idx].sync) return
  if (item.match) {
    const { subtitleId, videoId } = item.match
    const matchedSubtitle = session.value.data[videoId].subtitleRows[subtitleId]
    matchedSubtitle.text = item.text
    matchedSubtitle.start = item.start + offset
    matchedSubtitle.end = item.end + offset
    $update.targets.push({
      name: 'subtitle-update',
      target: matchedSubtitle,
      idx: videoId,
    })
  }
}
const addSubtitle = ({ after, afterIndex, newSubtitle = null }, idx) => {
  const subtitleToAdd = newSubtitle || {
    start: (after?.end || 0) + 10,
    end: (after?.end || 0) + 510,
    text: 'New',
    id: uniqueId(),
  }

  if (after === null || afterIndex === null) {
    // situation when there are no subtitles
    session.value.data[idx].subtitleRows.push(subtitleToAdd)
  } else {
    const nextSubtitle = session.value.data[idx].subtitleRows[afterIndex + 1]
    session.value.data[idx].subtitleRows.splice(afterIndex + 1, 0, subtitleToAdd)
    if (nextSubtitle && subtitleToAdd.end >= nextSubtitle.start) {
      adjustSubtitleTimes({ subtitleToAdd, after, nextSubtitle })
      $update.targets.push({
        name: 'subtitle-update',
        target: nextSubtitle,
        idx,
      })
      $update.targets.push({
        name: 'subtitle-update',
        target: after,
        idx,
      })
    } else {
      subtitleToAdd.end += 1500
    }
  }
  $update.targets.push({
    name: 'subtitle-add',
    target: subtitleToAdd,
    idx,
  })
}
const deleteSubtitle = (subtitle, idx) => {
  const index = session.value.data[idx].subtitleRows.findIndex(x => x.id === subtitle.id)
  session.value.data[idx].subtitleRows.splice(index, 1)
  $update.targets.push({
    name: 'subtitle-delete',
    target: subtitle,
    idx,
  })
}
const extractSubtitles = async index => {
  try {
    const { data } = await $apiService.sendMessage('extract-subtitles', {
      file: session.value.data[index].videoFile,
    })
    if (data && !data.error) {
      session.value.data[index].subtitleRows = parseSubtitles(data)
      $update.targets.push({
        name: 'subtitles',
        target: null,
        idx: index,
      })
    } else {
      errorMessage.value = data.error
    }
  } catch (error) {
    errorMessage.value = error?.response?.data?.error || ''
  }
}

// other handlers
const matchSubtitles = index => {
  const isTimeAligned = index => {
    const x = session.value.data[index]
    return x?.offset && x.offset !== 0
  }

  if (session.value.data[index].sync) {
    session.value.data[index].sync = false
    session.value.data.forEach(x => (x.active = null))
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
const handleActiveSubtitle = (subtitle, idx) => {
  session.value.data[idx].active = subtitle
  if (!session.value.data[idx].sync) return
  if (subtitle.match) {
    const { subtitleId, videoId } = subtitle.match
    session.value.data[videoId].active = session.value.data[videoId].subtitleRows[subtitleId]
  } else {
    const videoId = idx === session.value.data.length - 1 ? idx - 1 : idx + 1
    session.value.data[videoId].active = null
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
watch(
  $loading,
  value => {
    if (value) {
      loadingMessage.value = value
    }
  },
  { immediate: true },
)
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
      style="height: 70vh; max-width: 50%"
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
      @match-subtitles="() => matchSubtitles(idx)"
      @add-subtitle="addSubtitle($event, idx)"
      @delete-subtitle="deleteSubtitle($event, idx)"
      @activate-subtitle="handleActiveSubtitle($event, idx)"
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
    @activate-subtitle="handleActiveSubtitle($event.unwrap, $event.idx)"
  />
  <ErrorBox
    :error="errorMessage"
    @update:error="errorMessage = $event"
  />
  <LoaderSpinner
    v-if="loadingMessage.message"
    :text="loadingMessage.message"
    :stuck="loadingMessage.stuck"
  />
</template>

<style>
#app {
  padding: 1rem 0 !important;
  max-width: 100vw !important;
  width: 90vw;
  height: 100vh;
}
html {
  overflow-y: hidden !important;
}
</style>
