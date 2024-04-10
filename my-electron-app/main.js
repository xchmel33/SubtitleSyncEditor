// main.js

// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain } = require('electron')
const { convertToMp3, extractSrtSubtitles, loadSrtSubtitles } = require('./backend/converter.js')
const path = require('node:path')
const fs = require('node:fs')

const createWindow = async () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    fullscreen: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  // and load the index.html of the app.
  await mainWindow.loadFile(path.resolve(__dirname, './dist/index.html'))

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
}

app.whenReady().then(async () => {
  await createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.on('extract-audio', convertToMp3)

ipcMain.on('open-file-dialog', event => {
  const window = BrowserWindow.getFocusedWindow()

  dialog.showOpenDialog(
    window,
    {
      // Dialog configuration
      properties: ['openFile'],
      filters: [{ name: 'All Files', extensions: ['*'] }],
    },
    filePaths => {
      if (filePaths) {
        // Assuming you want to send the first selected file path
        const selectedFilePath = filePaths[0]
        event.sender.send('open-file-dialog', {
          name: path.basename(selectedFilePath),
          path: selectedFilePath,
        })
      }
    },
  )
})
ipcMain.handle('extract-subtitles', async (event, file) => {
  try {
    const data = await extractSrtSubtitles(file)
    return { data }
  } catch (error) {
    return { error: error.message }
  }
})

ipcMain.handle('load-subtitles', (event, { filename, isPath }) => {
  if (isPath) {
    filename = filename.replace(/[\r\n]/g, '')
    filename = path.resolve(filename)
    if (!fs.existsSync(filename)) {
      return { error: `File ${filename} not found` }
    }
    filename = fs.readFileSync(filename).toString()
  }
  const data = loadSrtSubtitles(filename)
  return { data }
})

ipcMain.handle('get-files', async () => {
  if (!fs.existsSync('./backend/files.json')) {
    fs.writeFileSync('./backend/files.json', JSON.stringify({}))
  }
  const files = fs.readFileSync('./backend/files.json')
  return JSON.parse(files.toString()) || []
})

ipcMain.handle('save-files', async (event, files) => {
  if (!fs.existsSync('./backend/files.json')) {
    fs.writeFileSync('./backend/files.json', JSON.stringify([]))
  }
  if (files.length) {
    fs.writeFileSync('./backend/files.json', JSON.stringify(files, null, 2))
  }
  return { status: 'ok' }
})
