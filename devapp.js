const express = require('express')
const { exec } = require('child_process')
const path = require('path')
const {
  extractSubtitles,
  loadSubtitles,
  saveSubtitles,
  mergeSubtitles,
} = require('./backend/converter.js')
const {
  getFiles,
  saveFile,
  getVariants,
  deleteVariant,
  saveVariant,
  addTime,
} = require('./backend/fileManager.js')
const cors = require('cors')
const fs = require('fs')
const { crossCorrelate, alignSubtitles } = require('./backend/correlate.js')
const { getWav } = require('./backend/converter')
const dialog = require('node-file-dialog')
const { scanDirectory } = require('./backend/fileManager')

const app = express()
const port = 3000
app.use(express.json({ limit: '50mb' }))
app.use(
  cors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  }),
)

app.post('/extract-subtitles', (req, res) => {
  const { file } = req.body
  extractSubtitles(file)
    .then(data => res.send(data))
    .catch(error => res.status(500).json({ error: error.message }))
})

app.post('/preview-subtitles', (req, res) => {
  const { subtitles } = req.body
  res.send(saveSubtitles(subtitles, 'preview.srt', true))
})
app.post('/embed-subtitles', (req, res) => {
  const { inputFilePath, subtitles, outputFilePath } = req.body
  mergeSubtitles(inputFilePath, subtitles, outputFilePath)
    .then(() => res.send({ status: 'ok' }))
    .then(() => {
      fs.rmSync(subtitles)
      console.log(`Subtitles merged,\ntemp file ${subtitles} removed`)
    })
    .catch(error => res.status(500).json({ error: error.message }))
})

app.post('/load-subtitles', (req, res) => {
  let { filename, isPath } = req.body
  if (isPath) {
    filename = filename.replace(/[\r\n]/g, '')
    filename = path.resolve(filename)
    if (!fs.existsSync(filename)) {
      res.status(404).json({ error: `File ${filename} not found` })
      return
    }
  }
  if (isPath) filename = fs.readFileSync(filename).toString()
  const data = loadSubtitles(filename)
  res.send(data)
})

app.post('/save-subtitles', (req, res) => {
  const { subtitles, filename } = req.body
  saveSubtitles(subtitles, filename)
  res.send({ status: 'ok' })
})

app.get('/get-files', (req, res) => {
  res.send(getFiles())
})

app.post('/save-file', (req, res) => {
  const { file } = req.body
  console.log('Save file:', file)
  saveFile(file)
  res.send({ status: 'ok' })
})

app.post('/get-variants', (req, res) => {
  const { file } = req.body
  res.send(getVariants(file))
})

app.post('/save-variant', (req, res) => {
  const { file, variant } = req.body
  saveVariant(file, variant)
  res.send({ status: 'ok' })
})

app.post('/delete-variant', (req, res) => {
  const { file, variants } = req.body
  const next = deleteVariant(file, variants)
  res.send({ status: 'ok', next })
})

app.post('/open-file', (req, res) => {
  const { time, path } = req.body
  addTime(path, time)
  res.send({ status: 'ok' })
})
app.post('/open-file-dialog', (req, res) => {
  const config = { type: 'open-file' }
  try {
    dialog(config)
      .then(file => {
        const p = path.resolve(file[0])
        const localPath = p.replace(process.cwd(), '.')
        res.send({ localPath, name: path.basename(p), path: p })
      })
      .catch(err => {
        res.status(500).send({ error: err })
      })
  } catch (err) {
    res.status(500).send({ error: err })
  }
})

app.post('/open-files-dialog', (req, res) => {
  const config = { type: 'open-files' }
  try {
    dialog(config)
      .then(files => {
        const p = files.map(f => path.resolve(f))
        const localPath = p.map(f => f.replace(process.cwd(), '.'))
        res.send({ localPath, name: p.map(f => path.basename(f)), files: p })
      })
      .catch(err => {
        res.status(500).send({ error: err })
      })
  } catch (err) {
    res.status(500).send({ error: err })
  }
})
app.post('/open-folder-dialog', (req, res) => {
  const { type } = req.body
  const config = { type: 'directory' }
  try {
    dialog(config).then(dir => {
      const p = path.resolve(dir[0])
      const localPath = p.replace(process.cwd(), '.')
      const files = scanDirectory(p, type)
      res.send({ localPath, name: path.basename(p), path: p, files })
    })
  } catch (err) {
    res.status(500).send({ error: err })
  }
})

app.post('/save-file-dialog', (req, res) => {
  const config = { type: 'save-file' }
  try {
    dialog(config)
      .then(file => {
        res.send({ filePath: file[0] })
      })
      .catch(err => {
        res.status(500).send({ error: err })
      })
  } catch (err) {
    res.status(500).send({ error: err })
  }
})

app.get('/cwd', (req, res) => {
  res.send({ cwd: process.cwd() })
})

app.post('/console-log', (req, res) => {
  const { message } = req.body
  console.log(message)
  res.send({ status: 'ok' })
})

app.post('/save-session', (req, res) => {
  const { session } = req.body
  fs.writeFileSync('./backend/session.json', session)
  res.send({ status: 'ok' })
  // console.log('Session saved')
})

app.post('/load-session', (req, res) => {
  if (!fs.existsSync('./backend/session.json')) {
    res.send({})
    return
  }
  const session = fs.readFileSync('./backend/session.json')
  res.send(JSON.parse(session.toString()))
  // console.log('Session loaded')
})

app.post('/cross-correlate', (req, res) => {
  const { segment, audio } = req.body

  const startTime = process.hrtime() // Start timing
  const average = 0
  const { bestOffset } = crossCorrelate(segment, audio, average)
  const endTime = process.hrtime(startTime) // End timing

  // Convert [seconds, nanoseconds] to total seconds
  const executionTime = endTime[0] + endTime[1] / 1e9
  console.log(`Execution time: ${executionTime}s, average: ${average} samples`)
  res.send({ bestOffset, executionTime })
})

const sampleRate = 8000
app.post('/align-signals', async (req, res) => {
  const { segment, audio, segmentIndex, audioIndex } = req.body
  const { offsetSeconds } = await alignSubtitles({
    segment,
    audio,
    sampleRate,
    segmentIndex,
    audioIndex,
  })
  res.send({ offsetSeconds })
})

app.post('/get-wav', (req, res) => {
  const { videoFilename } = req.body
  const startTime = process.hrtime() // Start timing
  getWav(videoFilename, sampleRate).then(wavFilename => {
    res.send({ wavFilename })
    const endTime = process.hrtime(startTime) // End timing
    const executionTime = endTime[0] + endTime[1] / 1e9
    console.log(`Converted ${videoFilename} to Wav in: ${executionTime}s`)
  })
})

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})
