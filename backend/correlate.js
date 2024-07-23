const fs = require('fs')
const wav = require('wav')
const Meyda = require('meyda')

const readWavFile = filePath => {
  return new Promise((resolve, reject) => {
    const reader = new wav.Reader()
    const audioData = []

    if (!fs.existsSync(filePath)) {
      filePath = `${process.cwd()}${filePath}`
    }
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found')
    }

    // reader.on('format', format => {
    //   console.log('WAV format:', format)
    // })

    reader.on('data', data => {
      const sampleArray = new Int16Array(
        data.buffer,
        data.byteOffset,
        data.length / Int16Array.BYTES_PER_ELEMENT,
      )
      audioData.push(...sampleArray)
    })

    reader.on('error', err => {
      reject(err)
    })

    reader.on('end', () => {
      resolve(audioData)
    })

    fs.createReadStream(filePath).pipe(reader)
  })
}

const extractMFCCs = (audioData, sampleRate, bufferSize) => {
  Meyda.sampleRate = sampleRate
  Meyda.bufferSize = bufferSize // A common bufferSize for MFCC
  const mfccs = []

  for (let i = 0; i < audioData.length; i += Meyda.bufferSize) {
    let buffer = audioData.slice(i, i + Meyda.bufferSize)
    if (buffer.length === Meyda.bufferSize) {
      const mfcc = Meyda.extract('mfcc', buffer)
      mfccs.push(mfcc)
    }
  }

  return mfccs
}

const crossCorrelateMFCC = (mfccSegment, mfccSignal) => {
  let maxCorr = -Infinity // Start with a very low correlation score.
  let bestOffset = 0

  for (let offset = 0; offset <= mfccSignal.length - mfccSegment.length; offset++) {
    let sum = 0

    for (let i = 0; i < mfccSegment.length; i++) {
      let diffSum = 0
      for (let j = 0; j < mfccSegment[i].length; j++) {
        // Calculate squared difference for each MFCC coefficient
        let diff = mfccSegment[i][j] - mfccSignal[i + offset][j]
        diffSum += diff * diff
      }
      sum -= diffSum // Subtract to simulate correlation (minimizing distance)
    }

    // We look for the maximum since sum is negative (maximally less negative is better)
    if (sum > maxCorr) {
      maxCorr = sum
      bestOffset = offset
    }
  }

  return { bestOffset, maxCorr: -maxCorr }
}

const findAudioSegmentOffset = async ({ segmentObj, audioFile, sampleRate, bufferSize = 512 }) => {
  const { file, start, duration } = segmentObj
  const segmentAllAudio = await readWavFile(file)
  const segment = segmentAllAudio.slice(start * sampleRate, (start + duration) * sampleRate)
  const audio = await readWavFile(audioFile)

  console.log('Segment length:', segment.length)
  console.log('Audio length:', audio.length)

  const mfccSegment = extractMFCCs(segment, sampleRate, bufferSize)
  const mfccSignal = extractMFCCs(audio, sampleRate, bufferSize)

  console.log('MFCC segment length:', mfccSegment.length)
  console.log('MFCC signal length:', mfccSignal.length)

  const { bestOffset, maxCorr } = crossCorrelateMFCC(mfccSegment, mfccSignal)
  return {
    offsetSeconds: (bufferSize / sampleRate) * bestOffset,
    segmentAllAudio,
    allAudio: audio,
    maxCorr,
  }
}

module.exports = {
  findAudioSegmentOffset,
}
