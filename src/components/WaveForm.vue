<script setup lang="js">
import WaveSurfer from 'wavesurfer.js'
import Hover from 'wavesurfer.js/dist/plugins/hover.js'
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js'
import { onMounted, ref, watch, getCurrentInstance } from 'vue'
import MenuPopup from '@/components/lib/MenuPopup.vue'
import { getFilename, loadWav, uniqueId } from '@/utilities/helpers'
import { debounce } from 'lodash'

const { $update, $loading } = getCurrentInstance().appContext.config.globalProperties

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
    type: String,
    default: '85',
  },
  wsStartPos: {
    type: String,
    default: '100',
  },
  currentTime: {
    type: Number,
    default: 0,
  },
  offset: {
    type: Number,
    default: 0,
  },
  offsetMs: {
    type: Number,
    default: 0,
  },
  idx: {
    type: Number,
    default: -1,
  },
  sync: {
    type: Boolean,
    default: false,
  },
})

const loading = ref(true)
const subtitlesSynced = ref(props.sync)
const waveform = ref(null)
const ws = ref(null)
const wsRegions = ref(null)
const decoded = ref(false)
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

// const videoElement = computed(() => document.getElementById(`video_player_${props.videoName}`))

const addRegion = subtitle => {
  const region = wsRegions.value.addRegion({
    start: subtitle.start / 1000,
    end: subtitle.end / 1000,
    loop: false,
    color: !subtitlesSynced.value
      ? 'hsla(300, 100%, 30%, 0.5)'
      : subtitle.aligned
        ? 'rgba(0, 255, 0, 0.3)'
        : 'rgba(255, 0, 0, 0.3)',
    drag: true,
    resize: true,
    content: subtitle.text || '',
    contentEditable: true,
  })
  region.subId = subtitle.id
  Object.assign(region.content.style, {
    display: 'block',
    fontSize: '0.75rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    position: 'relative',
  })
  region.content.setAttribute('data-test', `subtitle_${subtitle.id}`)
  region.content.parentElement.style.display = 'flex'
  return region
}

const updateRegion = (subtitle, region) => {
  if (region) {
    region.setOptions({
      content: subtitle.text || ' ',
      start: subtitle.start / 1000,
      end: subtitle.end / 1000,
    })
    Object.assign(region.content.style, {
      margin: 'auto',
      display: 'block',
      fontSize: '0.75rem',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    })
    region.content.parentElement.style.display = 'flex'
  } else {
    addRegion(subtitle)
  }
}

const updateRegionsFromSubtitles = () => {
  $loading.message = 'Loading subtitles into waveform...'
  $loading.stuck = true
  console.log('Update regions from subtitles', props.sync)
  setTimeout(() => {
    requestAnimationFrame(() => {
      wsRegions.value.regions.forEach(region => {
        if (region && !region.wasRemoved) {
          region.remove()
          region.wasRemoved = true
          const i = wsRegions.value.regions.indexOf(region)
          delete wsRegions.value.regions[i]
        }
      })
      props.videoSubtitles.forEach(subtitle => {
        addRegion(subtitle)
      })
      setTimeout(() => {
        $loading.message = ''
        $loading.stuck = false
      })
    })
  })
}
const updateSubtitleFromRegion = region => {
  const subtitle = props.videoSubtitles.find(sub => sub.id === region.subId)
  if (subtitle) {
    subtitle.start = region.start * 1000
    subtitle.end = region.end * 1000
    subtitle.text = region.content.textContent
    emit('update-subtitle', { item: subtitle, index: props.videoSubtitles.indexOf(subtitle) })
  }
}
const handleRegionDrag = region => {
  const regions = wsRegions.value.getRegions().sort((a, b) => a.start - b.start)
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
  menuPos.value = { x: e.clientX, y: window.innerHeight * 0.85, time: menuPos.value.time || 0 }
  openWaveMenu.value.click()
}
const handleTimeUpdate = () => {
  if (ws.value) {
    ws.value.setTime(time.value)
  }
  const container = document.getElementById('waveform-container')
  const currentContainerWidth = ws.value.renderer.container.getBoundingClientRect().width
  const maxWidth = Math.max(
    ...Array.from(document.getElementsByClassName('waveform')).map(
      x => x.children[0].shadowRoot.querySelector('.scroll').getBoundingClientRect().width,
    ),
  )
  const containerRatio = currentContainerWidth / maxWidth
  const cursorPosPercent = ws.value.getCurrentTime() / ws.value.getDuration()
  const scrollPos = container.scrollWidth * cursorPosPercent * containerRatio - 100 // 100 is cursor offset from start
  container.scrollTo({
    left: scrollPos,
  })
}

const initWaveSurfer = async () => {
  if (ws.value) {
    ws.value.destroy()
  }
  const wavFilename = await loadWav(props.videoName)
  const startTime = new Date()
  ws.value = WaveSurfer.create({
    url: wavFilename,
    container: waveform.value,
    waveColor: 'aqua',
    progressColor: 'aqua',
    cursorColor: 'red',
    hideScrollbar: true,
    barAlign: 'bottom',
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
    // videoElement.value.currentTime = region.start + (region.end - region.start) / 2
    emit('set-time-to', region.start + (region.end - region.start) / 2)
    const active = props.videoSubtitles.find(sub => sub.id === region.subId)
    emit('compare-audio', { start: active.start, end: active.end })
    emit('activate-subtitle', active)
  })
  ws.value.on('decode', () => {
    if (decoded.value) return
    decoded.value = true
  })
  ws.value.on('ready', async () => {
    loading.value = false
    ws.value.setOptions({ height: props.wsStartPos })
    ws.value.zoom(props.zoomLevel)
    addOffset()
    updateRegionsFromSubtitles()
    const endTime = new Date()
    const loadDuration = endTime - startTime // Calculate the load duration
    console.log(`Wavesurfer is ready. Loading took ${loadDuration} milliseconds.`)
  })
  ws.value.on('click', progress => {
    menuPos.value.time = progress * ws.value.getDuration()
    ws.value.setTime(time.value)
  })
  ws.value.on('audioprocess', () => {
    handleTimeUpdate()
  })

  waveform.value.addEventListener('click', handleOpenWaveMenu)
}
const extractRegions = (audioData, duration) => {
  const minValue = 0.01
  const minSilenceDuration = 0.1
  const mergeDuration = 0.2
  const scale = duration / audioData.length
  const silentRegions = []

  // Trim audio data to start from the end of last subtitle region
  const lastSubtitle = props.videoSubtitles[props.videoSubtitles.length - 1]
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

    const newSubtitles = []
    regions.forEach((region, index) => {
      newSubtitles.push({
        id: uniqueId(),
        start: region.start * 1000,
        end: region.end * 1000,
        text: index.toString(),
      })
    })
    emit('update-subtitles', newSubtitles)
  }
}

const getAudioData = (start = -1, end = -1) => {
  const decodedData = ws.value.getDecodedData()
  if (start === -1 && end === -1)
    return { audio: decodedData.getChannelData(0), sampleRate: decodedData.sampleRate }
  const startIdx = Math.floor(start * decodedData.sampleRate)
  const endIdx = Math.floor(end * decodedData.sampleRate)
  return {
    audio: decodedData.getChannelData(0).slice(startIdx, endIdx),
    sampleRate: decodedData.sampleRate,
  }
}

const getAudioSum = (start = -1, end = -1) => {
  const { audio } = getAudioData(start, end)
  return audio.reduce((acc, val) => acc + Math.abs(val), 0)
}

const getRegionAudio = subtitleId => {
  const subtitle = props.videoSubtitles.find(sub => sub.id === subtitleId)
  if (!subtitle) return []
  const start = subtitle.start
  const end = subtitle.end
  const { audio } = getAudioData(start / 1000, end / 1000)
  return audio
}

const addOffset = () => {
  if (!ws.value) return
  const { audio } = getAudioData()
  const waveDiv = waveform.value?.children[0] || {}
  if (!waveDiv) {
    console.error('Waveform not found!')
    return
  }
  waveDiv.shadowRoot.querySelector('.wrapper').style.marginLeft = 0
  const totalWidth = waveDiv.getBoundingClientRect().width
  const offsetWidth = (totalWidth / audio.length) * props.offset
  waveDiv.shadowRoot.querySelector('.wrapper').style.marginLeft = `${offsetWidth}px`
}
const reload = async () => {
  if (ws.value) {
    waveform.value.removeEventListener('click', handleOpenWaveMenu)
    ws.value.destroy()
    ws.value = null
  }
  await initWaveSurfer()
}

const handleDeleteSubtitle = () => {
  const subtitleToDelete = props.videoSubtitles.find(sub => sub.id === currentRegion.value.subId)
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
    emit('add-subtitle', {
      after: null,
      afterIndex: -1,
    })
  }
  const subtitle = props.videoSubtitles.find(sub => sub.id === regionRef.subId)
  emit('add-subtitle', {
    after: subtitle,
    afterIndex: props.videoSubtitles.indexOf(subtitle),
  })
}

onMounted(async () => {
  await initWaveSurfer()
})

watch(
  () => props.offset,
  () => {
    addOffset()
  },
)
watch(
  () => props.zoomLevel,
  debounce((newVal, oldVal) => {
    ws.value.zoom(newVal)
    // we need to call this twice due to some render bug
    if (!(oldVal && newVal > oldVal)) {
      ws.value.zoom(newVal)
    }
    addOffset()
  }, 150),
)

watch(
  () => props.wsStartPos,
  debounce(newVal => {
    // we need to call this twice due to some render bug
    ws.value.setOptions({ height: newVal })
    ws.value.setOptions({ height: newVal })
  }, 150),
)
watch(
  () => props.videoName,
  async (newSource, oldSource) => {
    if (newSource !== oldSource) {
      await initWaveSurfer()
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
const handleSubtitleUpdates = () => {
  const { name, target, idx } = $update.targets[$update.targets.length - 1]
  if (idx !== props.idx) return
  let region = null
  if (target && target.id && target.id !== -1)
    region = wsRegions.value.regions.find(region => region && region.subId === target.id)
  switch (name) {
    case 'subtitles':
      if (target?.sync !== undefined) {
        subtitlesSynced.value = target.sync
      }
      updateRegionsFromSubtitles()
      break
    case 'subtitle-update':
      updateRegion(target, region)
      break
    case 'subtitle-delete':
      if (region) {
        region.remove()
        delete wsRegions.value.regions[wsRegions.value.regions.indexOf(region)]
      }
      break
    case 'subtitle-add':
      addRegion(target)
      break
    default:
      break
  }
  $update.targets.pop()
}
watch(
  () => $update.targets,
  () => {
    if (!$update.targets.length) return
    if ($update.targets[$update.targets.length - 1] === 'undo-redo') {
      updateRegionsFromSubtitles()
      if (props.idx === Array.from(document.getElementsByClassName('waveform')).length - 1)
        $update.targets = []
    } else {
      handleSubtitleUpdates()
    }
  },
  { deep: true },
)

defineExpose({
  getRegionAudio,
})

const wsButtons = [
  {
    label: 'Add subtitle here',
    action: handleAddSubtitle,
  },
  {
    label: 'Detect subtitles',
    condition: () => !props.videoSubtitles.length,
    action: drawRegions,
  },
  {
    label: 'Reload waveform',
    action: reload,
  },
  {
    label: 'Clear alignment',
    condition: () => props.offset,
    action: () => {
      emit('clear-offset')
    },
  },
]
const regionButtons = [
  {
    label: 'Delete subtitle',
    action: handleDeleteSubtitle,
  },
  {
    label: 'Align subtitle',
    condition: () => !props.offset,
    action: () => {
      const start = currentRegion.value.start
      const duration = currentRegion.value.end - currentRegion.value.start
      const { sampleRate } = getAudioData()
      emit('align-subtitle', { start, duration, sampleRate })
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
    <div class="d-flex align-center justify-space-between">{{ videoName }}</div>
    <div style="width: 60vw">
      <v-progress-circular
        v-if="loading"
        :data-test="`waveform_loading_${idx}`"
        indeterminate
        color="orange"
        size="64"
        width="7"
      />
      <div>
        <div
          :data-test="`waveform_${idx}`"
          ref="waveform"
          id="waveform"
          class="waveform"
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
            style="
              position: fixed;
              width: 225px;
              height: fit-content;
              transform: translateY(-50%) translateX(-25%);
            "
            class="wrapper d-flex ga-2 flex-column"
          >
            <div style="font-size: small">{{ getFilename(videoName) }}</div>
            <button
              v-for="button in wsButtons.filter(btn => !btn.condition || btn.condition())"
              :key="button.label"
              :data-test="`waveMenu_button_${idx}_${button.label}`"
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
            style="
              position: fixed;
              width: 225px;
              height: fit-content;
              transform: translateY(-50%) translateX(-25%);
            "
            class="wrapper d-flex ga-2 flex-column"
          >
            <div style="font-size: small">{{ currentRegion.text }}</div>
            <button
              v-for="button in regionButtons.filter(btn => !btn.condition || btn.condition())"
              :key="button.label"
              :data-test="`regionMenu_button_${idx}_${button.label}`"
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
.wsRegionAligned::before,
.wsRegionAligned::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: hsla(200, 100%, 30%, 0.5);
  border-left: 1px dashed;
}
.wsRegionAligned::before {
  left: 0;
  transform: rotateY(0deg);
}
.wsRegionAligned::after {
  right: 0;
  transform: rotateY(0deg);
}
</style>
