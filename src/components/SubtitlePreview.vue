<script setup>
import { defineProps, getCurrentInstance, onMounted, ref, watch } from 'vue'
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
onMounted(async () => {
  if (!props.subtitleRows.length) {
    preview.value = ''
    return
  }
  preview.value = await previewSubtitles(props.subtitleRows)
})
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
