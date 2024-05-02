<script setup lang="js">
import WaveSurfer from 'wavesurfer.js'
import Hover from 'wavesurfer.js/dist/plugins/hover.js'
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js'
import { ref, onMounted, watch, computed } from 'vue'
import MenuPopup from '@/components/lib/MenuPopup.vue'

const props = defineProps({
  videoSubtitles: {
    type: Array,
    default: () => [],
  },
  videoName: {
    type: String,
    default: '',
  },
  zoomLevel: {
    type: Number,
    default: 85,
  },
  wsStartPos: {
    type: Number,
    default: 100,
  },
  currentTime: {
    type: Number,
    default: 0,
  },
  offset: {
    type: Number,
    default: 0,
  },
})

const loading = ref(true)
const waveform = ref(null)
const ws = ref(null)
const wsRegions = ref(null)
const decoded = ref(false)
const subtitles = ref(props.videoSubtitles)
const time = ref(props.currentTime)
const openWaveMenu = ref(null)
const openRegionMenu = ref(null)
const menuPos = ref({ x: 0, y: 0, time: 0 })
const currentRegion = ref('')

const emit = defineEmits([
  'update-subtitle',
  'update-subtitles',
  'align-subtitle',
  'load',
  'clear-offset',
  'delete-subtitle',
  'set-time-to',
])

const videoElement = computed(() => document.getElementById(`video_player_${props.videoName}`))

const addRegion = (start, end, text) => {
  const region = wsRegions.value.addRegion({
    start,
    end,
    loop: false,
    color: 'hsla(300, 100%, 30%, 0.5)',
    drag: true,
    resize: true,
    content: text || '',
    contentEditable: true,
  })
  return region
}
const updateRegionsFromSubtitles = () => {
  wsRegions.value.regions.forEach(region => {
    if (region && !region.wasRemoved) {
      region.remove()
      region.wasRemoved = true
      const i = wsRegions.value.regions.indexOf(region)
      delete wsRegions.value.regions[i]
    }
  })
  subtitles.value.forEach(subtitle => {
    const region = addRegion(subtitle.start / 1000, subtitle.end / 1000, subtitle.text)
    region.subId = subtitle.id
  })
}
const updateSubtitleFromRegion = region => {
  const subtitleIndex = subtitles.value.findIndex(sub => sub.id === region.subId)
  if (subtitleIndex !== -1) {
    subtitles.value[subtitleIndex].start = region.start * 1000
    subtitles.value[subtitleIndex].end = region.end * 1000
    subtitles.value[subtitleIndex].text = region.content.textContent
    emit('update-subtitle', { item: subtitles.value[subtitleIndex], index: subtitleIndex })
  }
}
const handleRegionDrag = region => {
  const regions = wsRegions.value.getRegions()
  const regionIndex = regions.indexOf(region)
  const regionStart = region.start
  const regionEnd = region.end

  // check if region is overlapping with his left neighbor
  const nearestLeftRegion = regions
    .filter((r, i) => i < regionIndex)
    .reduce((acc, r) => (r.end > acc.end ? r : acc), { end: 0 })
  if (nearestLeftRegion.end > regionStart) {
    region.start = nearestLeftRegion.end
    region.end = regionEnd + (nearestLeftRegion.end - regionStart)
  }

  // check if region is overlapping with his right neighbor
  const nearestRightRegion = regions
    .filter((r, i) => i > regionIndex)
    .reduce((acc, r) => (r.start < acc.start ? r : acc), { start: 1000000 })
  if (nearestRightRegion.start < regionEnd) {
    region.end = nearestRightRegion.start
    region.start = regionStart - (regionEnd - nearestRightRegion.start)
  }
}
const handleOpenWaveMenu = e => {
  menuPos.value = { x: e.clientX, y: e.clientY, time: menuPos.value.time || 0 }
  openWaveMenu.value.click()
}
const handleTimeUpdate = () => {
  const container = document.getElementById('waveform-container')
  const cursorPosPercent = ws.value.getCurrentTime() / ws.value.getDuration()
  const scrollPos = container.scrollWidth * cursorPosPercent - 100 // 100 is cursor offset from start
  container.scrollTo({
    left: scrollPos,
  })
}
const initWaveSurfer = () => {
  if (ws.value) {
    ws.value.destroy()
  }
  ws.value = WaveSurfer.create({
    container: waveform.value,
    waveColor: 'aqua',
    progressColor: 'aqua',
    cursorColor: 'red',
    fillParent: true,
    barAlign: 'bottom',
    media: videoElement.value,
    plugins: [
      Hover.create({
        lineColor: '#ff0000',
        lineWidth: 2,
        labelBackground: '#555',
        labelColor: '#fff',
        labelSize: '11px',
      }),
    ],
  })
  wsRegions.value = ws.value.registerPlugin(RegionsPlugin.create())
  wsRegions.value.on('region-created', region => {
    region.content.style.margin = 'auto'
    region.listeners.update.add(() => handleRegionDrag(region))
  })
  wsRegions.value.on('region-updated', region => {
    region.content.style.margin = 'auto'
    updateSubtitleFromRegion(region)
  })
  wsRegions.value.on('region-clicked', (region, e) => {
    e.stopPropagation()
    menuPos.value = { x: e.clientX, y: e.clientY, time: menuPos.value.time || 0 }
    currentRegion.value = {
      text: region.content.textContent,
      start: region.start,
      end: region.end,
      subId: region.subId,
    }
    openRegionMenu.value.click()
  })
  ws.value.on('decode', () => {
    if (decoded.value) return
    updateRegionsFromSubtitles()
    decoded.value = true
  })
  ws.value.on('ready', () => {
    loading.value = false
    ws.value.setOptions({ height: props.wsStartPos })
    ws.value.zoom(props.zoomLevel)
    addOffset()
  })
  ws.value.on('click', progress => {
    // console.log('Set menu time', progress * ws.value.getDuration())
    menuPos.value.time = progress * ws.value.getDuration()
    ws.value.setTime(time.value)
  })
  ws.value.on('audioprocess', () => {
    handleTimeUpdate()
  })
  console.log('Wavesurfer', ws.value)

  waveform.value.addEventListener('click', handleOpenWaveMenu)
}
const extractRegions = (audioData, duration) => {
  const minValue = 0.01
  const minSilenceDuration = 0.1
  const mergeDuration = 0.2
  const scale = duration / audioData.length
  const silentRegions = []

  // Trim audio data to start from the end of last subtitle region
  const lastSubtitle = subtitles.value[subtitles.value.length - 1]
  const lastSubtitleEnd = (lastSubtitle ? lastSubtitle.end : 0) / 1000
  const startIndex = Math.floor(lastSubtitleEnd / scale)

  // Find all silent regions longer than minSilenceDuration
  let start = 0
  let end = 0
  let isSilent = false
  for (let i = startIndex; i < audioData.length; i++) {
    if (audioData[i] < minValue) {
      if (!isSilent) {
        start = i
        isSilent = true
      }
    } else if (isSilent) {
      end = i
      isSilent = false
      if (scale * (end - start) > minSilenceDuration) {
        silentRegions.push({
          start: scale * start,
          end: scale * end,
        })
      }
    }
  }

  // Merge silent regions that are close together
  const mergedRegions = []
  let lastRegion = null
  for (let i = 0; i < silentRegions.length; i++) {
    if (lastRegion && silentRegions[i].start - lastRegion.end < mergeDuration) {
      lastRegion.end = silentRegions[i].end
    } else {
      lastRegion = silentRegions[i]
      mergedRegions.push(lastRegion)
    }
  }

  // Find regions that are not silent
  const regions = []
  let lastEnd = lastSubtitleEnd + 0.01
  for (let i = 0; i < mergedRegions.length; i++) {
    if (mergedRegions[i].start - lastEnd > 0)
      regions.push({
        start: lastEnd,
        end: mergedRegions[i].start,
      })
    lastEnd = mergedRegions[i].end
  }
  if (lastEnd < duration) {
    regions.push({
      start: lastEnd,
      end: duration,
    })
  }
  return regions
}
const drawRegions = () => {
  const decodedData = ws.value.getDecodedData()
  if (decodedData) {
    const regions = extractRegions(decodedData.getChannelData(0), ws.value.getDuration())

    // Add regions to the waveform
    regions.forEach((region, index) => {
      // addRegion(region.start, region.end, index.toString())
      subtitles.value.push({
        id: index,
        start: region.start * 1000,
        end: region.end * 1000,
        text: index.toString(),
      })
    })
    emit('update-subtitles', subtitles.value)
  }
}

const getRegionAudio = region => {
  const decodedData = ws.value.getDecodedData()
  const start = Math.floor(region.start * decodedData.sampleRate)
  const end = Math.floor(region.end * decodedData.sampleRate)
  return decodedData.getChannelData(0).slice(start, end)
}
const getAudioData = () => {
  const decodedData = ws.value.getDecodedData()
  return { audio: decodedData.getChannelData(0), sampleRate: decodedData.sampleRate }
}

const addOffset = () => {
  console.log('Adding offset', props.offset)
  if (!ws.value) return
  const { audio } = getAudioData()
  const waveDiv = waveform.value?.children[0] || {}
  if (!waveDiv) {
    console.error('Waveform not found!')
    return
  }
  const totalWidth = waveDiv.getBoundingClientRect().width
  const offsetWidth = (totalWidth / audio.length) * props.offset
  waveDiv.shadowRoot.querySelector('.wrapper').style.marginLeft = `${offsetWidth}px`
}
const reload = () => {
  if (ws.value) {
    waveform.value.removeEventListener('click', handleOpenWaveMenu)
    ws.value.destroy()
    ws.value = null
  }
  initWaveSurfer()
}

const handleDeleteSubtitle = () => {
  const subtitleToDelete = subtitles.value.find(sub => sub.id === currentRegion.value.subId)
  emit('delete-subtitle', subtitleToDelete)
}

const handleAddSubtitle = () => {
  let regionRef
  const timeRef = menuPos.value.time || 0
  wsRegions.value.regions.forEach(region => {
    if (region.end < timeRef && (!regionRef || region.end > regionRef.end)) {
      regionRef = region
    }
  })
  if (!regionRef || !regionRef.subId) {
    emit('add-subtitle', null)
  }
  const subtitle = subtitles.value.find(sub => sub.id === regionRef.subId)
  emit('add-subtitle', subtitle)
}

const handleSetTimeToSubtitle = () => {
  const subtitle = subtitles.value.find(sub => sub.id === currentRegion.value.subId)
  emit('set-time-to', subtitle.start / 1000)
}

onMounted(() => {
  initWaveSurfer()
})

watch(
  () => props.offset,
  () => {
    addOffset()
  },
)
watch(
  () => props.zoomLevel,
  (newVal, oldVal) => {
    ws.value.zoom(newVal)
    // we need to call this twice due to some render bug
    if (oldVal && newVal > oldVal) return
    ws.value.zoom(newVal)
  },
)

watch(
  () => props.wsStartPos,
  newVal => {
    // we need to call this twice due to some render bug
    ws.value.setOptions({ height: newVal })
    ws.value.setOptions({ height: newVal })
  },
)

watch(
  () => props.videoSubtitles,
  () => {
    subtitles.value = props.videoSubtitles
    updateRegionsFromSubtitles()
  },
  { deep: true },
)

watch(
  () => props.videoName,
  (newSource, oldSource) => {
    if (newSource !== oldSource) {
      initWaveSurfer()
    }
  },
)

watch(
  () => props.currentTime,
  newTime => {
    time.value = newTime
    handleTimeUpdate()
  },
)

defineExpose({
  getAudioData,
})

const wsButtons = [
  {
    label: 'Set playback time from here',
    action: () => {
      emit('set-time-to', menuPos.value.time)
    },
  },
  {
    label: 'Add subtitle here',
    action: handleAddSubtitle,
  },
  {
    label: 'Detect subtitles',
    action: drawRegions,
  },
  {
    label: 'Reload subtitles',
    action: updateRegionsFromSubtitles,
  },
  {
    label: 'Reload waves',
    action: reload,
  },
]
const regionButtons = [
  {
    label: 'Set playback time from here',
    action: handleSetTimeToSubtitle,
  },
  {
    label: 'Delete subtitle',
    action: handleDeleteSubtitle,
  },
  {
    label: 'Align subtitle',
    condition: () => !props.offset,
    action: () => {
      const segment = getRegionAudio(currentRegion.value)
      const start = ws.value.getDecodedData().sampleRate * currentRegion.value.start
      emit('align-subtitle', { segment, start })
    },
  },
  {
    label: 'Clear alignment',
    condition: () => props.offset,
    action: () => {
      emit('clear-offset')
    },
  },
]
</script>
<template>
  <div>
    <div class="d-flex align-center justify-space-between"></div>
    <div style="width: 60vw">
      <v-progress-circular
        v-if="loading"
        indeterminate
        color="orange"
        size="64"
        width="7"
      />
      <div>
        <div
          ref="waveform"
          id="waveform"
          style="width: 100%"
        ></div>
      </div>
      <MenuPopup>
        <template #opener="{ methods }">
          <button
            @click.stop="methods.toggleOpen()"
            hidden
            ref="openWaveMenu"
          />
        </template>
        <template #default="{ methods }">
          <div
            :style="{ top: `${menuPos.y}px`, left: `${menuPos.x}px` }"
            style="position: fixed; width: 225px; height: 210px; transform: translateY(-100%)"
            class="wrapper d-flex ga-2 flex-column"
          >
            <div style="font-size: small">{{ videoName }}</div>
            <button
              v-for="button in wsButtons"
              :key="button.label"
              class="text_button text_button_small"
              @click.stop="
                () => {
                  button.action()
                  methods.toggleOpen()
                }
              "
            >
              {{ button.label }}
            </button>
          </div>
        </template>
      </MenuPopup>
      <MenuPopup>
        <template #opener="{ methods }">
          <button
            @click.stop="methods.toggleOpen()"
            hidden
            ref="openRegionMenu"
          />
        </template>
        <template #default="{ methods }">
          <div
            :style="{ top: `${menuPos.y}px`, left: `${menuPos.x}px` }"
            style="position: fixed; width: 225px; height: 150px; transform: translateY(-100%)"
            class="wrapper d-flex ga-2 flex-column"
          >
            <div style="font-size: small">{{ currentRegion.text }}</div>
            <button
              v-for="button in regionButtons.filter(btn => !btn.condition || btn.condition())"
              :key="button.label"
              class="text_button text_button_small"
              @click.stop="
                () => {
                  button.action()
                  methods.toggleOpen()
                }
              "
            >
              {{ button.label }}
            </button>
          </div>
        </template>
      </MenuPopup>
    </div>
  </div>
</template>

<style>
#waveform div {
  overflow-y: hidden;
  width: fit-content;
}
</style>
