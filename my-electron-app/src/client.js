// apiService.js
import axios from 'axios'

const isElectron = !!import.meta.env.VITE_IS_ELECTRON

const apiService = {
  extractAudio(file) {
    if (isElectron) {
      window.electron.ipcRenderer.send('upload-file', file)
    }
    let formData = new FormData()
    formData.append('file', { path: file })

    return axios.post('http://localhost:3000/extract-audio', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },
  sendMessage(channel, data, config) {
    if (!isElectron) {
      console.log(data)
      return axios.post(`http://localhost:3000/${channel}`, data, config)
    }
    return new Promise(resolve => {
      window.electron.ipcRenderer.once(channel, (event, response) => {
        resolve(response)
      })
      window.electron.ipcRenderer.send(channel, data)
    })
  },
}

export default apiService
