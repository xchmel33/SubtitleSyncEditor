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
    // console.log('API request:', channel, data)
    // console.log('API response:', response)
    const plainData = JSON.parse(JSON.stringify(data))
    return {
      data: await window.electron.ipcRenderer.invoke(channel, plainData),
    }
  },
}

export default apiService
