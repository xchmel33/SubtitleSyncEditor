<script setup>
import { sessionLoader } from '@/utilities/session'
import { computed, ref, watch, getCurrentInstance, onMounted, nextTick } from 'vue'
import { adjustSubtitleTimes, parseSubtitles } from '@/utilities/subtitles'
import ContentContainer from '@/components/ContentContainer.vue'
import WaveContainer from '@/components/WaveContainer.vue'
import ErrorBox from '@/components/ErrorBox.vue'
import { addListeners, handleKeyCombination } from '@/utilities/listeners'
import { uniqueId } from '@/utilities/helpers'
import LoaderSpinner from '@/components/LoaderSpinner.vue'

const { $apiService, $error, $loading, $update } =
  getCurrentInstance().appContext.config.globalProperties

const { session, undo, redo, load } = sessionLoader([
  // 'active',
  'hover',
  'match',
  'merge',
  'currentTime',
])
const errorMessage = ref('')
const loadingMessage = ref({ message: '', stuck: false })
const concurrentEditing = ref({
  text: false,
  time: false,
})

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
}
const handleSubtitleUpdate = ({ item, index }, idx) => {
  session.value.data[idx].subtitleRows[index] = item
  let offset = session.value.data[idx].offsetMs || 0
  $update.targets.push({
    name: 'subtitle-update',
    target: item,
    idx,
  })
  if (
    !session.value.data[idx].sync ||
    !(concurrentEditing.value.time || concurrentEditing.value.text)
  ) {
    return
  }
  if (item.aligned) {
    const videoId = idx === session.value.data.length - 1 ? idx - 1 : idx + 1
    const matchedSubtitle = session.value.data[videoId].subtitleRows.find(
      x => x.id === item.aligned,
    )
    if (!matchedSubtitle) {
      return
    }
    if (session.value.data[videoId].offsetMs) {
      offset = -session.value.data[videoId].offsetMs
    }
    if (concurrentEditing.value.time) {
      matchedSubtitle.start = item.start + offset
      matchedSubtitle.end = item.end + offset
    }
    if (concurrentEditing.value.text) {
      matchedSubtitle.text = item.text
    }
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
const addVideoFile = async (e, i) => {
  session.value.data[i].videoFile = e.localPath || e.path || e
}
const handleAlignmentUpdate = ({ index, offset, offsetMs }) => {
  session.value.data[index].offset = offset
  session.value.data[index].offsetMs = offsetMs
  session.value.data.forEach(x => {
    x.sync = offset !== 0
    x.subtitleRows.forEach(y => (y.aligned = offset !== 0))
  })
  session.value.data.forEach((x, idx) => {
    $update.targets.push({
      name: 'subtitles',
      target: { sync: offset !== 0 },
      idx,
    })
  })
}
const handleSetTimeTo = (time, idx) => {
  const videoElement = document.getElementById(`video_player_${session.value.data[idx].videoFile}`)
  if (videoElement) {
    videoElement.currentTime = time
  }
}
const handleActiveSubtitle = (subtitle, idx) => {
  session.value.data[idx].active = subtitle
  if (!session.value.data[idx].sync) return
  if (subtitle.aligned) {
    const videoId = idx === session.value.data.length - 1 ? idx - 1 : idx + 1
    const matchedSubtitle = session.value.data[videoId].subtitleRows.find(
      x => x.id === subtitle.aligned,
    )
    if (!matchedSubtitle) {
      return
    }
    session.value.data[videoId].active = matchedSubtitle
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
const handleConcurrentEditing = e => {
  if (!session.value.data.some(x => x.sync)) concurrentEditing.value = { text: false, time: false }
  else concurrentEditing.value = e
}

const reloadSession = async subtitleIndex => {
  await load()
  session.value.data.forEach((x, idx) => {
    $update.targets.push({
      name: 'subtitles',
      target: { sync: true },
      idx,
    })
  })
  nextTick().then(() => {
    if (subtitleIndex !== undefined) {
      const idx = session.value.data.findIndex(x => x.offset !== 0)
      const subtitle = session.value.data[idx].subtitleRows[subtitleIndex]
      handleActiveSubtitle(subtitle, idx)
    }
  })
}

const allFilesLoaded = computed(() => {
  return session.value.data.every(x => x.videoFile && x.subtitleRows.length)
})
</script>

<template>
  <div class="d-flex flex-column ga-1">
    <div class="d-flex ga-2">
      <ContentContainer
        style="height: 65vh; max-width: 50%"
        class="flex-1-1"
        v-for="(item, idx) in session.data"
        :key="item.id"
        :item="item"
        :maxSubtitles="maxSubtitles"
        :is-last="idx === session.data.length - 1"
        :index="idx"
        :concurrentEditing="concurrentEditing"
        :allFilesLoaded="allFilesLoaded"
        @update:videoFile="e => addVideoFile(e, idx)"
        @update:subtitleFile="session.data[idx].subtitleFile = $event"
        @update:subtitles="handleSubtitlesUpdate($event, idx)"
        @update:subtitle="handleSubtitleUpdate($event, idx)"
        @update:time="session.data[idx].currentTime = $event"
        @extract-subtitles="() => extractSubtitles(idx)"
        @concurrent-editing="handleConcurrentEditing($event)"
        @add-subtitle="addSubtitle($event, idx)"
        @delete-subtitle="deleteSubtitle($event, idx)"
        @activate-subtitle="handleActiveSubtitle($event, idx)"
        @reload-session="reloadSession"
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
      @reload-session="reloadSession"
    />
  </div>
  <ErrorBox
    data-test="error_box"
    :error="errorMessage"
    @update:error="errorMessage = $event"
  />
  <LoaderSpinner
    data-test="loader_spinner"
    v-if="loadingMessage.message"
    :text="loadingMessage.message"
    :stuck="loadingMessage.stuck"
  />
</template>

<style>
#app {
  padding: 1rem 0 !important;
  max-width: 100vw !important;
  width: 98vw;
  height: 100vh;
}
html {
  overflow-y: hidden !important;
}
</style>
