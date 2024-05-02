// apiService.js
import axios from 'axios'

const isElectron = typeof window.electron !== 'undefined'

const apiService = {
  async sendMessage(channel, data, config) {
    if (!isElectron) {
      if (config?.method === 'GET') {
        return await axios.get(`http://localhost:3000/${channel}`)
      }
      return await axios.post(`http://localhost:3000/${channel}`, data, config)
    }
    return {
      data: await window.electron.ipcRenderer.invoke(channel, data),
    }
  },
}

export default apiService