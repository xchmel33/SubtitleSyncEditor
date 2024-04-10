<script setup lang="js">
import WaveSurfer from 'wavesurfer.js'
import Hover from 'wavesurfer.js/dist/plugins/hover.js'
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js'
import { ref, onMounted, watch, computed } from 'vue'
import { detectSpeech } from '@/dtw'

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
})

const loading = ref(true)
const waveform = ref(null)
const ws = ref(null)
const wsRegions = ref(null)
const decoded = ref(false)
const subtitles = ref(props.videoSubtitles)

const emit = defineEmits(['update-subtitle', 'load'])

const videoElement = computed(() => document.getElementById(`video_player_${props.videoName}`))

const updateRegionsFromSubtitles = subs => {
  wsRegions.value.regions.forEach(region => {
    if (region && !region.wasRemoved) {
      region.remove()
      region.wasRemoved = true
      const i = wsRegions.value.regions.indexOf(region)
      delete wsRegions.value.regions[i]
    }
  })
  subs.value.forEach(subtitle => {
    const region = wsRegions.value.addRegion({
      start: subtitle.start / 1000,
      end: subtitle.end / 1000,
      loop: false,
      color: 'hsla(400, 100%, 30%, 0.5)',
      drag: true,
      resize: true,
      content: subtitle.text || ' ',
      contentEditable: true,
    })
    region.subId = subtitle.id
  })
}

const updateSubtitleFromRegion = region => {
  const subtitleIndex = subtitles.value.findIndex(sub => sub.id === region.subId)
  if (subtitleIndex !== -1) {
    subtitles.value[subtitleIndex].start = region.start * 1000
    subtitles.value[subtitleIndex].end = region.end * 1000
    subtitles.value[subtitleIndex].text = region.content.textContent
    emit('update-subtitle', subtitles, subtitleIndex)
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

const initWaveSurfer = () => {
  if (ws.value) {
    ws.value.destroy()
  }
  ws.value = WaveSurfer.create({
    container: waveform.value,
    waveColor: 'aqua',
    progressColor: 'aqua',
    cursorColor: 'red',
    scrollParent: true,
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
  ws.value.on('decode', () => {
    if (decoded.value) return
    updateRegionsFromSubtitles(subtitles)
    decoded.value = true
  })
  ws.value.on('ready', () => {
    loading.value = false
    ws.value.setOptions({ height: props.wsStartPos })
    ws.value.zoom(props.zoomLevel)
  })

  document.addEventListener('drag', e => {
    console.log('drag', e)
  })
}

onMounted(() => {
  initWaveSurfer()
})

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
  () => subtitles,
  newSubtitles => {
    updateRegionsFromSubtitles(newSubtitles)
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
</script>
<template>
  <div>
    <div class="d-flex align-center justify-space-between">
      <div class="my-2">{{ videoName }}</div>

      <button
        class="text_button"
        @click.stop="() => detectSpeech(videoElement)"
      >
        Detect speech
      </button>
    </div>
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
    </div>
  </div>
</template>

<style>
#waveform div {
  overflow-y: hidden;
  width: fit-content;
}
</style>
