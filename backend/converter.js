const ffmpeg = require('fluent-ffmpeg')
const path = require('path')
const fs = require('fs')
const { parseSync, stringifySync } = require('subtitle')

const convertToMp3 = (callback, filePath) => {
  const outputAudioPath = `videos/${path.basename(filePath, path.extname(filePath))}.wav`

  if (fs.existsSync(outputAudioPath)) {
    console.log('Audio already extracted')
    loadFromFile(callback, outputAudioPath)
    return
  }

  ffmpeg(filePath)
    .audioCodec('pcm_s16le')
    .format('wav')
    .on('end', () => {
      // Read the output file
      fs.readFile(outputAudioPath, (err, data) => {
        if (err) {
          console.error('Error reading the file:', err)
          callback([])
          return
        }

        // Convert the Buffer to an array (or you can send the Buffer directly)
        const audioArray = Array.prototype.slice.call(data)
        callback(audioArray)
      })
    })
    .on('error', err => {
      console.error('Error:', err)
      callback([])
    })
    .save(outputAudioPath)
}

const extractSrtSubtitles = inputFilePath => {
  return new Promise((resolve, reject) => {
    inputFilePath = inputFilePath
      .replace(/\\/g, '/')
      .replace(/\//g, '\\')
      .replace(/file:\\\\\\/g, '')
      .replace(/\r\n/, '')
    if (!fs.existsSync(inputFilePath)) {
      console.error('The input file does not exist:', inputFilePath)
      reject(new Error('Input file not found'))
      return
    }
    const outputFilePath = `${process.cwd()}\\videos\\${path.basename(inputFilePath, path.extname(inputFilePath))}.srt`
    ffmpeg(inputFilePath)
      .outputOptions([
        '-map 0:s:0', // Assumes the first subtitle stream; adjust if needed
        '-c:s srt', // Specifies copying the subtitle stream as-is, assuming it's in SRT format
      ])
      .save(outputFilePath)
      .on('end', () => {
        console.log(`Subtitles have been extracted to: ${outputFilePath}`)
        // Read and parse the subtitle file
        fs.readFile(outputFilePath, 'utf8', (err, data) => {
          if (err) {
            console.error('Error reading the subtitle file: ' + err.message)
            reject(err)
          } else {
            try {
              const subtitlesObj = parseSync(data)
              resolve(subtitlesObj)
            } catch (parseError) {
              console.error('Error parsing the subtitle file: ' + parseError.message)
              reject(parseError)
            }
          }
        })
      })
      .on('error', err => {
        console.error('An error occurred: ' + err.message)
        reject(err)
      })
  })
}

const loadSrtSubtitles = subtitles => {
  return parseSync(subtitles)
}

const saveSubtitles = (subtitles, outputFilePath, preview = false) => {
  const format = outputFilePath.endsWith('.vtt') ? 'WebVTT' : 'SRT'
  const srtString = stringifySync(subtitles, { format })
  if (preview) return srtString
  fs.writeFileSync(outputFilePath, srtString)
}

const mergeSrtSubtitles = (inputFilePath, subtitles, outputFilePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputFilePath)
      .input(subtitles)
      .outputOptions(['-c copy', '-c:s mov_text'])
      .save(outputFilePath)
      .on('end', () => {
        console.log(`Subtitles have been merged to: ${outputFilePath}`)
        resolve(outputFilePath)
      })
      .on('error', err => {
        console.error('An error occurred: ' + err.message)
        reject(err)
      })
  })
}

const loadFromFile = (callback, filePath) => {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      console.error('Error reading the file:', err)
      callback([])
      return
    }

    // Convert the Buffer to an array (or you can send the Buffer directly)
    const audioArray = Array.prototype.slice.call(data)
    callback(audioArray)
  })
}

module.exports = {
  loadFromFile,
  convertToMp3,
  extractSrtSubtitles,
  mergeSrtSubtitles,
  loadSrtSubtitles,
  saveSubtitles,
}
