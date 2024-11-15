// main.js

// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain, Menu, MenuItem, dialog } = require('electron')
const { extractSubtitles, loadSubtitles } = require('./backend/converter.js')
const path = require('node:path')
const fs = require('node:fs')
const url = require('node:url')
const {
  saveFile,
  getFiles,
  saveVariant,
  getVariants,
  deleteVariant,
  addTime,
  scanDirectory,
  closeFile,
} = require('./backend/fileManager')
const { crossCorrelate, alignSignals, alignAllSubtitles } = require('./backend/correlate')
const { mergeSubtitles, saveSubtitles, getWav } = require('./backend/converter')

const createWindow = async () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    maximizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: true,
      enableRemoteModule: false,
    },
  })

  // and load the index.html of the app.
  await mainWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, `/dist/index.html`),
      protocol: 'file:',
      slashes: true,
    }),
  )

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  mainWindow.webContents.on('context-menu', (event, params) => {
    const menu = new Menu()

    // Add each spelling suggestion
    for (const suggestion of params.dictionarySuggestions) {
      menu.append(
        new MenuItem({
          label: suggestion,
          click: () => mainWindow.webContents.replaceMisspelling(suggestion),
        }),
      )
    }

    // Allow users to add the misspelled word to the dictionary
    if (params.misspelledWord) {
      menu.append(
        new MenuItem({
          label: 'Add to dictionary',
          click: () =>
            mainWindow.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord),
        }),
      )
    }

    menu.popup()
  })
}

app.whenReady().then(async () => {
  await createWindow()
  console.log('App is ready')

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('open-file-dialog', async (event, { type }) => {
  const window = BrowserWindow.getFocusedWindow()
  const extensions = type === 'video' ? ['mkv', 'mp4', 'avi', 'mov', 'flv', 'wmv'] : ['srt', 'vtt']

  const { canceled, filePaths } = await dialog.showOpenDialog(window, {
    properties: ['openFile'],
    filters: [{ name: `${type.charAt(0).toUpperCase()}${type.slice(1)} files`, extensions }],
  })

  if (!canceled && filePaths.length > 0) {
    const selectedFilePath = filePaths[0]
    return {
      name: path.basename(selectedFilePath),
      path: selectedFilePath,
    }
  }
  return null
})

ipcMain.handle('open-folder-dialog', async (event, { type }) => {
  const window = BrowserWindow.getFocusedWindow()

  const { canceled, filePaths } = await dialog.showOpenDialog(window, {
    properties: ['openDirectory'],
  })

  if (!canceled && filePaths.length > 0) {
    const p = path.resolve(filePaths[0])
    const localPath = p.replace(process.cwd(), '.')
    const files = scanDirectory(p, type)
    return {
      localPath,
      name: path.basename(p),
      path: p,
      files,
    }
  }
  return null
})

ipcMain.handle('open-files-dialog', async (event, { type }) => {
  const window = BrowserWindow.getFocusedWindow()
  const extensions = type === 'video' ? ['mkv', 'mp4', 'avi', 'mov', 'flv', 'wmv'] : ['srt', 'vtt']

  const { canceled, filePaths } = await dialog.showOpenDialog(window, {
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: `${type.charAt(0).toUpperCase()}${type.slice(1)} files`, extensions }],
  })

  if (!canceled && filePaths.length > 0) {
    const p = filePaths.map(f => path.resolve(f))
    const localPath = p.map(f => f.replace(process.cwd(), '.'))
    return {
      localPath,
      name: p.map(f => path.basename(f)),
      files: p,
    }
  }
  return null
})

ipcMain.handle('save-file-dialog', (event, { defaultName, defaultExtensions, extensionsName }) => {
  const window = BrowserWindow.getFocusedWindow()

  dialog.showSaveDialog(
    window,
    {
      title: 'Save File',
      defaultPath: defaultName,
      filters: [
        { name: 'All Files', extensions: ['*'] },
        { name: extensionsName, extensions: defaultExtensions },
      ],
    },
    filePath => {
      if (filePath) {
        return { filePath }
      }
    },
  )
})
ipcMain.handle('extract-subtitles', async (event, { file }) => {
  try {
    return await extractSubtitles(file)
  } catch (error) {
    return { error: error.message }
  }
})

ipcMain.handle('close-file', (event, { id }) => {
  closeFile(id)
  return { status: 'ok' }
})

ipcMain.handle('embed-subtitles', async (event, { inputFilePath, subtitles, outputFilePath }) => {
  await mergeSubtitles(inputFilePath, subtitles, outputFilePath)
  fs.rmSync(subtitles)
  console.log(`Subtitles merged,\ntemp file ${subtitles} removed`)
  return { status: 'ok' }
})

ipcMain.handle('preview-subtitles', (event, { subtitles }) => {
  return saveSubtitles(subtitles, 'preview.srt', true)
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
  return loadSubtitles(filename)
})

ipcMain.handle('get-files', () => {
  return getFiles()
})

ipcMain.handle('save-file', async (event, { file }) => {
  const saved = saveFile(file)
  return { saved }
})

ipcMain.handle('open-file', (event, { path, time }) => {
  return addTime(path, time)
})

ipcMain.handle('get-variants', (event, { file }) => {
  return getVariants(file)
})

ipcMain.handle('save-variant', (event, { file, variant }) => {
  saveVariant(file, variant)
  return { status: 'ok' }
})

ipcMain.handle('delete-variant', (event, { file, variants }) => {
  console.log('Delete variant:', file, variants)
  return deleteVariant(file, variants)
})

ipcMain.handle('save-session', (event, { session }) => {
  fs.writeFileSync('./backend/session.json', session)
  return { status: 'ok' }
})

ipcMain.handle('load-session', () => {
  if (!fs.existsSync('./backend/session.json')) {
    console.log('No session file found')
    return {}
  }
  const data = fs.readFileSync('./backend/session.json')
  console.log('Session loaded: ', data.toString().length)
  return JSON.parse(data.toString())
})

ipcMain.handle('cross-correlate', (event, { segment, audio }) => {
  return crossCorrelate(segment, audio)
})
const sampleRate = 8000 // Global sample rate for the audio signal
ipcMain.handle('get-wav', async (event, { videoFilename }) => {
  let res = await getWav(videoFilename, sampleRate)
  res = path.join(process.cwd(), res.toString())
  console.log('WAV file:', res)
  return { wavFilename: res }
})

ipcMain.handle('align-signals', async (event, { segment, audio }) => {
  return await alignSignals({ segment, audio, sampleRate })
})

ipcMain.handle('align-all-subtitles', async event => {
  return await alignAllSubtitles()
})

ipcMain.handle('cwd', () => {
  return process.cwd()
})

ipcMain.handle('console-log', (event, { message }) => {
  console.log(message)
  return { status: 'ok' }
})

ipcMain.handle('test-async', async (event, { message }) => {
  return await new Promise(resolve => {
    setTimeout(() => {
      resolve({ message: message + ' async' })
    }, 1000)
  })
})
