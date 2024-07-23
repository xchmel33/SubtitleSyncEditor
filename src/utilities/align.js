import { nextTick, getCurrentInstance } from 'vue'

export const useAlign = emitCallback => {
  const { $apiService, $error, $loading } = getCurrentInstance().appContext.config.globalProperties

  const alignSubtitles = async ({ subtitleRef = null }) => {
    await nextTick().then(() => {
      $loading.message = 'Aligning subtitles...'
    })
    await nextTick().then(async () => {
      try {
        const { data } = await $apiService.sendMessage('align-subtitles', { subtitleRef })
        const { subtitleIndex } = data
        if (subtitleIndex === -1) {
          $error.message = 'No matching subtitles found'
          return
        }
        emitCallback(subtitleIndex)
      } catch (error) {
        $error.message = error.message
      }
    })
    await nextTick().then(() => {
      $loading.message = ''
    })
  }
  return { alignSubtitles }
}
