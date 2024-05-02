// main.js

// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain, Menu, MenuItem, dialog } = require('electron')
const { extractSrtSubtitles, loadSrtSubtitles } = require('./backend/converter.js')
const path = require('node:path')
const fs = require('node:fs')
const { saveFile, getFiles, saveVariant, getVariants } = require('./backend/fileManager')
const { crossCorrelate } = require('./backend/correlate')
const { mergeSrtSubtitles, saveSubtitles } = require('./backend/converter')

const createWindow = async () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    maximizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  // and load the index.html of the app.
  await mainWindow.loadFile(path.resolve(__dirname, './dist/index.html'))

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

ipcMain.handle('open-file-dialog', () => {
  const window = BrowserWindow.getFocusedWindow()

  dialog.showOpenDialog(
    window,
    {
      properties: ['openFile'],
      filters: [{ name: 'All Files', extensions: ['*'] }],
    },
    filePaths => {
      if (filePaths) {
        const selectedFilePath = filePaths[0]
        return {
          name: path.basename(selectedFilePath),
          path: selectedFilePath,
        }
      }
    },
  )
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
    return await extractSrtSubtitles(file)
  } catch (error) {
    return { error: error.message }
  }
})

ipcMain.handle('embed-subtitles', async (event, { inputFilePath, subtitles, outputFilePath }) => {
  await mergeSrtSubtitles(inputFilePath, subtitles, outputFilePath)
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
  return loadSrtSubtitles(filename)
})

ipcMain.handle('get-files', () => {
  return getFiles()
})

ipcMain.handle('save-file', async (event, { file }) => {
  saveFile(file)
  return { status: 'ok' }
})

ipcMain.handle('get-variants', (event, { file }) => {
  return getVariants(file)
})

ipcMain.handle('save-variant', (event, { file }) => {
  saveVariant(file)
  return { status: 'ok' }
})

ipcMain.handle('save-session', (event, { session }) => {
  fs.writeFileSync('./backend/session.json', JSON.stringify(session, null, 2))
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
