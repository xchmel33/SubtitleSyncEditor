<script setup>
import { defineProps, getCurrentInstance, ref, watch } from 'vue'
import { formatSubtitles } from '@/utilities/subtitles'

const { $apiService, $error } = getCurrentInstance().appContext.config.globalProperties

const props = defineProps({
  subtitleRows: {
    type: Object,
    default: () => {
      return []
    },
  },
})

const preview = ref('')
const altPreview = '\n\nLoad subtitles\nto preview them here.'
const previewSubtitles = async subtitles => {
  subtitles = formatSubtitles(subtitles)

  try {
    const { data } = await $apiService.sendMessage('preview-subtitles', { subtitles })
    if (!data) return ''
    return data
  } catch (error) {
    $error.message = error?.response?.data?.error || ''
  }
}
watch(
  () => props.subtitleRows,
  async () => {
    if (!props.subtitleRows.length) {
      preview.value = ''
      return
    }
    preview.value = await previewSubtitles(props.subtitleRows)
  },
  { deep: true },
)
</script>

<template>
  <div class="d-flex justify-center w-100 mt-4">
    <perfect-scrollbar>
      <pre
        v-if="preview"
        style="text-align: left; font-size: 0.75rem"
        >{{ preview }}</pre
      >
      <pre
        v-else
        class="mx-auto"
        style="text-align: center"
        >{{ altPreview }}</pre
      >
    </perfect-scrollbar>
  </div>
  <!--  <div>
    <div class="d-flex flex-column w-100 ga-2">
      <h3 class="text-left">Active Subtitle</h3>
      <div class="form-row">
        <label for="start">Start</label>
        <input
          readonly
          id="start"
          type="text"
          class="form-control"
          style="width: 6.5rem; text-align: left"
          v-model="subtitle.start"
          placeholder="00:00:00.000"
        />
        <label for="duration">Duration</label>
        <input
          readonly
          id="duration"
          type="text"
          class="form-control"
          style="width: 4rem; text-align: left"
          v-model="subtitle.duration"
          placeholder="00:00:00.000"
        />
      </div>
      <div class="form-row">
        <label for="end">End</label>
        <input
          readonly
          id="end"
          type="text"
          class="form-control"
          style="width: 6.5rem; text-align: left"
          v-model="subtitle.end"
          placeholder="00:00:00.000"
        />
        <label for="cps">CPS</label>
        <input
          readonly
          id="cps"
          type="text"
          class="form-control"
          style="width: 4rem; text-align: left"
          v-model="subtitle.cps"
          placeholder="0"
        />
      </div>
      <div class="form-row">
        <label for="text">Text</label>
        <input
          readonly
          id="text"
          type="text"
          class="form-control"
          style="width: 15rem; text-align: left"
          v-model="subtitle.text"
          placeholder="Subtitle text"
        />
      </div>
    </div>
  </div>-->
</template>

<style scoped>
.form-row {
  text-align: left;
  display: flex;
  align-items: center;
  justify-content: flex-start;
}
.form-row label {
  text-align: left;
  width: 4.25rem;
}
.form-row input {
  text-align: left;
}
.ps {
  height: 90%;
  width: 100%;
}
</style>
