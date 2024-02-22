const express = require('express')
const { exec } = require('child_process')
const path = require('path')
const url = require('url')
const { extractSrtSubtitles, loadSrtSubtitles } = require('./backend/converter.js')
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
  let { file, isPath } = req.body
  if (isPath) file = fs.readFileSync(file).toString()
  const data = loadSrtSubtitles(file)
  res.send(data)
})

app.post('/open-file-dialog', (req, res) => {
  // Replace the path to your Python script as necessary
  exec('python ./backend/file_upload.py', (error, stdout, stderr) => {
    res.send({
      name: path.basename(stdout),
      error: error || stderr,
      path: url.format({
        pathname: path.resolve(stdout),
        protocol: 'file:',
        slashes: true,
      }),
    })
  })
})

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})
