const dialog = require('node-file-dialog')
const config = { type: 'directory' }
const { scanDirectory } = require('./backend/fileManager')

dialog(config)
  .then(dir => {
    const p = dir[0]
    const files = scanDirectory(p, 'video')
    console.log(files)
  })
  .catch(err => console.log(err))
