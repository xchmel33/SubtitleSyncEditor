import { getCurrentInstance, onMounted, ref } from 'vue'
import { cleanObject, timestamp, uniqueId } from '@/utilities/helpers'
export const sessionLoader = (keyBlacklist = []) => {
  const { $apiService } = getCurrentInstance().appContext.config.globalProperties

  const session = ref({
    id: '',
    lastSaved: '',
    data: [
      {
        id: '',
        sync: false,
        videoFile: '',
        currentTime: 0,
        subtitleFile: '',
        subtitleRows: [],
      },
      {
        id: '',
        sync: false,
        videoFile: '',
        currentTime: 0,
        subtitleFile: '',
        subtitleRows: [],
      },
    ],
    zoomLevel: 80,
    wsStartPos: 70,
  })

  const load = async (id = '') => {
    const { data } = await $apiService.sendMessage('load-session', { id })
    if (Object.keys(data).length) {
      session.value = data
    } else {
      session.value.id = uniqueId()
      session.value.lastSaved = timestamp()
      await save()
    }
  }

  const cleanSessionData = sessionData => {
    const result = []
    sessionData.forEach(item => {
      result.push(cleanObject(item, keyBlacklist))
    })
    return result
  }

  const save = async () => {
    const data = { data: cleanSessionData(session.value.data) }
    data.id = session.value.id || uniqueId()
    data.lastSaved = timestamp()
    await $apiService.sendMessage('save-session', { session: JSON.stringify(data, null, 2) })
  }

  onMounted(async () => {
    await load()
  })
  return { session, save, load }
}
