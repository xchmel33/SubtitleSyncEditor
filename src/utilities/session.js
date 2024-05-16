import { getCurrentInstance, onMounted, ref, watch } from 'vue'
import { cleanObject, lastItem, timestamp, uniqueId, compareObjects } from '@/utilities/helpers'
export const sessionLoader = (keyBlacklist = [], maxUndoRedo = 20) => {
  const { $apiService, $update } = getCurrentInstance().appContext.config.globalProperties

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
    history: {
      undoList: [],
      redoList: [],
    },
    zoomLevel: 80,
    wsStartPos: 70,
  })
  const lastSession = ref({})
  const blockUpdate = ref(false)

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
    data.history = session.value.history
    data.id = session.value.id || uniqueId()
    data.lastSaved = timestamp()
    await $apiService.sendMessage('save-session', { session: JSON.stringify(data, null, 2) })
  }

  const undo = async () => {
    if (session.value.history.undoList.length) {
      blockUpdate.value = true
      session.value.history.redoList.push(JSON.stringify(cleanSessionData(session.value.data)))
      session.value.data = JSON.parse(session.value.history.undoList.pop())
      await save()
      blockUpdate.value = false
      $update.targets.push('undo-redo')
    }
  }

  const redo = async () => {
    if (session.value.history.redoList.length) {
      blockUpdate.value = true
      session.value.history.undoList.push(JSON.stringify(cleanSessionData(session.value.data)))
      session.value.data = JSON.parse(session.value.history.redoList.pop())
      await save()
      blockUpdate.value = false
      $update.targets.push('undo-redo')
    }
  }

  const updateHistory = async (history, isRedo = false) => {
    await $apiService.sendMessage('console-log', {
      message: `Session history update ${timestamp()}`,
    })
    if (isRedo && !compareObjects(lastItem(session.value.history.redoList), history)) {
      session.value.history.redoList.push(JSON.stringify(history))
    } else if (!compareObjects(lastItem(session.value.history.undoList), history)) {
      session.value.history.undoList.push(JSON.stringify(history))
    }
    await save()
  }
  watch(
    () => session.value.data,
    async () => {
      if (blockUpdate.value) {
        return
      }
      const currentData = cleanSessionData(session.value.data)
      if (
        Object.keys(lastSession.value).length &&
        !compareObjects(currentData, lastSession.value)
      ) {
        // await session.value.data.reduce(async (x, i) => {
        //   await $apiService.sendMessage('console-log', {
        //     message: `Subtitles ${i}: ${x.subtitleRows.length}`,
        //   })
        // })
        await updateHistory(lastSession.value)
      }
      lastSession.value = [...currentData]
      if (session.value.history.undoList.length > maxUndoRedo) {
        session.value.history.undoList = session.value.history.undoList.slice(maxUndoRedo)
      }
      if (session.value.history.redoList.length > maxUndoRedo) {
        session.value.history.redoList = session.value.history.redoList.slice(maxUndoRedo)
      }
    },
    { deep: true },
  )
  onMounted(async () => {
    await load()
  })
  return { session, undo, redo, load }
}
