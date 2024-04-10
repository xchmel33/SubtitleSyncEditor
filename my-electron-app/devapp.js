const express = require('express')
const { exec } = require('child_process')
const path = require('path')
const { extractSrtSubtitles, loadSrtSubtitles } = require('./backend/converter.js')
const { getFiles, saveFile, getVariants, saveVariant } = require('./backend/fileManager.js')
const cors = require('cors')
const fs = require('fs')

const app = express()
const port = 3000
app.use(express.json())
app.use(
  cors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  }),
)

app.post('/extract-subtitles', (req, res) => {
  const { file } = req.body
  extractSrtSubtitles(file)
    .then(data => res.send(data))
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
  const data = loadSrtSubtitles(filename)
  res.send(data)
})

app.get('/get-files', (req, res) => {
  res.send(getFiles())
})

app.post('/save-file', (req, res) => {
  const { file } = req.body
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

app.post('/open-file-dialog', (req, res) => {
  // Replace the path to your Python script as necessary
  exec('python ./backend/file_upload.py', (error, stdout, stderr) => {
    res.send({
      name: path.basename(stdout),
      error: error || stderr,
      path: path.resolve(stdout),
    })
  })
})

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})
