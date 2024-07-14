<script setup>
import { getCurrentInstance, nextTick, ref, watch } from 'vue'
import WaveForm from '@/components/WaveForm.vue'
import { loadWav } from '@/utilities/helpers'

const { $apiService, $loading, $error } = getCurrentInstance().appContext.config.globalProperties

const props = defineProps({
  waveforms: {
    type: Array,
    default: () => [],
  },
  zoom: {
    type: String,
    default: '70',
  },
  wsStart: {
    type: String,
    default: '64',
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
  'activate-subtitle',
  'reload-session',
])
const zoomLevel = ref(props.zoom)
const wsStartPos = ref(props.wsStart)
const loading = ref(false)
const waveformsRef = ref([])

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
      const { start, duration } = alignmentData
      const segmentFile = await loadWav(props.waveforms[index].videoFile)
      const audioIndex = index + 1 < props.waveforms.length ? index + 1 : index - 1
      const audioFile = await loadWav(props.waveforms[audioIndex].videoFile)
      const { data } = await $apiService.sendMessage('align-signals', {
        segment: {
          file: segmentFile,
          start,
          duration,
        },
        audio: audioFile,
        segmentIndex: index,
        audioIndex,
      })
      const { offsetSeconds } = data
      emit('update:offset', {
        index,
        offset: offsetSeconds,
        offsetMs: offsetSeconds * 1000,
      })
      emit('reload-session')
    } catch (error) {
      $error.message = error.message
    }
  })
  await nextTick().then(() => {
    loading.value = false
  })
}

const isSynced = () => {
  return props.waveforms.some(x => x.sync)
}
</script>

<template>
  <div class="d-flex ga-8 mt-4">
    <div
      style="overflow-x: auto; overflow-y: hidden"
      class="d-flex flex-column flex-1-1"
      id="waveform-container"
    >
      <div
        v-for="(item, index) in waveforms"
        :key="item.id"
        class="mb-2"
      >
        <WaveForm
          :ref="el => waveformsRef.push(el)"
          v-if="item.videoFile"
          :idx="index"
          :currentTime="item.currentTime || 0"
          :videoSubtitles="item.subtitleRows"
          :video-name="item.videoFile"
          :zoom-level="zoomLevel"
          :ws-start-pos="wsStartPos"
          :offset="item.offset"
          :offsetMs="item.offsetMs"
          :sync="isSynced()"
          @alignSubtitle="alignSubtitle(index, $event)"
          @clearOffset="() => emit('update:offset', { index, offset: 0, offsetMs: 0 })"
          @update-subtitle="$emit('update:subtitle', { idx: index, unwrap: $event })"
          @update-subtitles="$emit('update:subtitles', { idx: index, unwrap: $event })"
          @add-subtitle="$emit('add-subtitle', { idx: index, unwrap: $event })"
          @delete-subtitle="$emit('delete-subtitle', { idx: index, unwrap: $event })"
          @set-time-to="$emit('set-time-to', { idx: index, unwrap: $event })"
          @activate-subtitle="$emit('activate-subtitle', { idx: index, unwrap: $event })"
        />
      </div>
    </div>
    <div
      style="font-size: small"
      class="h-100 d-flex justify-center align-center ga-5 flex-column my-auto"
    >
      <div class="d-flex align-center mb-5 flex-column">
        <label for="time-zoom">Time zoom</label>
        <input
          class="range_input"
          data-test="time-zoom"
          type="range"
          id="time-zoom"
          min="10"
          step="2"
          max="90"
          v-model="zoomLevel"
        />
        <span>{{ zoomLevel }}</span>
      </div>
      <div class="d-flex align-center mb-5 flex-column">
        <label
          style="font-size: small"
          for="wave-zoom"
          >Wave zoom</label
        >
        <input
          class="range_input"
          type="range"
          id="wave-zoom"
          min="50"
          max="100"
          step="2"
          v-model="wsStartPos"
        />
        <span>{{ wsStartPos }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.range_input {
  margin: 0.25rem 0;
  height: 0.25rem;
}
</style>
