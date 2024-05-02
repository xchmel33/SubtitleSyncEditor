<script setup>
import { ref, watch, getCurrentInstance, nextTick } from 'vue'
import WaveForm from '@/components/WaveForm.vue'

const { $apiService, $loading, $error } = getCurrentInstance().appContext.config.globalProperties

const props = defineProps({
  waveforms: {
    type: Array,
    default: () => [],
  },
  zoom: {
    type: Number,
    default: 70,
  },
  wsStart: {
    type: Number,
    default: 64,
  },
})

const emit = defineEmits([
  'update:zoom',
  'update:wsStart',
  'update:offset',
  'update:subtitle',
  'update:subtitles',
  'add-subtitle',
  'delete-subtitle',
  'set-time-to',
])
const waveformsRef = ref([])
const zoomLevel = ref(props.zoom)
const wsStartPos = ref(props.wsStart)
const loading = ref(false)

watch(zoomLevel, () => {
  emit('update:zoom', zoomLevel.value)
})
watch(wsStartPos, () => {
  emit('update:wsStart', wsStartPos.value)
})
watch(loading, () => {
  $loading.message = loading.value ? 'Aligning subtitles...' : ''
})

const alignSubtitle = async (index, alignmentData) => {
  await nextTick().then(() => {
    loading.value = true
  })
  await nextTick().then(async () => {
    try {
      const { segment, start } = alignmentData
      const audioComponent = waveformsRef.value[index + 1] || waveformsRef.value[index - 1]
      const { audio, sampleRate } = audioComponent.getAudioData()
      const { data } = await $apiService.sendMessage('cross-correlate', {
        segment: Array.from(segment),
        audio: Array.from(audio),
      })
      const { bestOffset } = data
      const offset = bestOffset - start
      const offsetMs = (offset / sampleRate) * 1000
      if (offset < 0) {
        const audioIndex = waveformsRef.value.indexOf(audioComponent)
        emit('update:offset', { index: audioIndex, offset: -offset, offsetMs })
      } else {
        emit('update:offset', { index, offset, offsetMs })
      }
    } catch (error) {
      $error.message = error.message
    }
  })
  await nextTick().then(() => {
    loading.value = false
  })
}
</script>

<template>
  <div class="d-flex ga-8">
    <div
      style="overflow-x: auto"
      class="d-flex flex-column ga-4 flex-1-1"
      id="waveform-container"
    >
      <div
        v-for="(item, index) in waveforms"
        :key="item.id"
      >
        <WaveForm
          :ref="el => waveformsRef.push(el)"
          v-if="item.videoFile"
          :currentTime="item.currentTime || 0"
          :videoSubtitles="item.subtitleRows"
          :video-name="item.videoFile"
          :zoom-level="zoomLevel"
          :ws-start-pos="wsStartPos"
          :offset="item.offset"
          @alignSubtitle="alignSubtitle(index, $event)"
          @clearOffset="() => emit('update:offset', { index, offset: 0, offsetMs: 0 })"
          @update-subtitle="$emit('update:subtitle', { idx: index, unwrap: $event })"
          @update-subtitles="$emit('update:subtitles', { idx: index, unwrap: $event })"
          @add-subtitle="$emit('add-subtitle', { idx: index, unwrap: $event })"
          @delete-subtitle="$emit('delete-subtitle', { idx: index, unwrap: $event })"
          @set-time-to="$emit('set-time-to', { idx: index, unwrap: $event })"
        />
      </div>
    </div>
    <div class="h-100 d-flex justify-center align-center ga-5 flex-column">
      <div class="d-flex align-center mb-5 flex-column">
        <label for="time-zoom">Time zoom</label>
        <input
          type="range"
          id="time-zoom"
          min="2"
          step="2"
          max="100"
          v-model="zoomLevel"
        />
      </div>
      <div class="d-flex align-center mb-5 flex-column">
        <label for="wave-zoom">Wave zoom</label>
        <input
          type="range"
          id="wave-zoom"
          min="50"
          max="100"
          step="2"
          v-model="wsStartPos"
        />
      </div>
    </div>
  </div>
</template>

<style scoped></style>
