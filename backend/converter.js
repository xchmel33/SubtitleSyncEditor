const ffmpeg = require('fluent-ffmpeg')
const path = require('path')
const fs = require('fs')
const { parseSync, stringifySync } = require('subtitle')

const extractSubtitles = inputFilePath => {
  if (!fs.existsSync(inputFilePath)) {
    inputFilePath = `.${inputFilePath}`
  }
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

const loadSubtitles = subtitles => {
  return parseSync(subtitles)
}

const saveSubtitles = (subtitles, outputFilePath, preview = false) => {
  const format = outputFilePath.endsWith('.vtt') ? 'WebVTT' : 'SRT'
  const srtString = stringifySync(subtitles, { format })
  if (preview) return srtString
  fs.writeFileSync(outputFilePath, srtString)
}

const mergeSubtitles = (inputFilePath, subtitles, outputFilePath) => {
  if (!fs.existsSync(inputFilePath)) {
    inputFilePath = `.${inputFilePath}`
  }
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

const convertToWave = (videoFilePath, wavFilePath, sampleRate) => {
  if (!fs.existsSync(videoFilePath)) {
    videoFilePath = `.${videoFilePath}`
  }
  if (!fs.existsSync(videoFilePath)) {
    console.error('The input file does not exist:', videoFilePath)
    return
  }
  return new Promise((resolve, reject) => {
    ffmpeg(videoFilePath)
      .audioCodec('pcm_s16le') // Set the audio codec
      .audioFrequency(sampleRate) // Set the sample rate
      .audioChannels(1) // Set to mono audio
      .format('wav') // Set the output format
      .on('end', () => {
        console.log(`Audio extracted to: ${wavFilePath}`)
        resolve(wavFilePath)
      })
      .on('error', err => {
        console.error('An error occurred: ' + err.message)
        reject(err)
      })
      .save(wavFilePath) // Output file path
  })
}
const convertVideoPathToWav = filepath => {
  // Replace all slashes and backslashes with underscores
  let filename = filepath.replace(/[/\\]/g, '_')

  // remove invalid characters
  filename = filename.replace(/[^a-zA-Z0-9_.-]/g, '')

  // Change the file extension to .wav
  filename = filename.replace(/\.\w+$/, '.wav')

  if (filename.startsWith('_')) {
    filename = filename.slice(1)
  }

  return filename
}

const getWav = async (videoFilename, sampleRate) => {
  if (!fs.existsSync('./backend/cache')) {
    fs.mkdirSync('./backend/cache')
  }
  const wavFilename = `backend/cache/${convertVideoPathToWav(videoFilename)}`
  if (fs.existsSync(wavFilename)) {
    console.log(`Loaded cached WAV file: ${wavFilename}`)
    return wavFilename
  }
  return await convertToWave(videoFilename, wavFilename, sampleRate)
}

module.exports = {
  extractSubtitles,
  mergeSubtitles,
  loadSubtitles,
  saveSubtitles,
  getWav,
}
