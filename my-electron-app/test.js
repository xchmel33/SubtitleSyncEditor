const path = require('path')
const fs = require('fs')

// const filename = `${process.cwd()}\\videos\\output.mp4`
// const filename = `C:\\Users\\lukXmelo\\Documents\\GitHub\\subSyncEditor\\my-electron-app\\videos\\output.mp4`
const filename = `C:\\Users\\lukXmelo\\Documents\\GitHub\\subSyncEditor\\my-electron-app\\videos\\output.mp4`

console.log({
  cwd: process.cwd(),
  filename,
  fileExist: fs.existsSync(filename),
})
