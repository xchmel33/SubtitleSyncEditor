const fs = require('fs')
const wav = require('wav')
const Meyda = require('meyda')

const readWavFile = filePath => {
  return new Promise((resolve, reject) => {
    const reader = new wav.Reader()
    const audioData = []

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

const alignWavFiles = async ({ segmentObj, audioFile, sampleRate, bufferSize = 512 }) => {
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

const processSubtitleRegions = (
  subtitles1,
  subtitles2,
  offset,
  audio1,
  audio2,
  sampleRate,
  avgCorr,
) => {
  let alignedCount = 0
  let missMatchCount = 0
  // const s2Block = []
  const correlationResults = []
  subtitles1.forEach(s1 => {
    if (missMatchCount > 4) return
    const s1Start = s1.start + offset
    const s1End = s1.end + offset
    const s2 = subtitles2.find(y => {
      const s2Start = y.start
      const s2End = y.end
      return (s1Start <= s2Start && s1End > s2Start) || (s1Start < s2End && s1End >= s2End)
    })
    if (!s2) return
    const s1Audio = audio1.slice((s1.start * sampleRate) / 1000, (s1.end * sampleRate) / 1000)
    const s2Audio = audio2.slice((s1Start * sampleRate) / 1000, (s1End * sampleRate) / 1000)
    const audio1MFCC = extractMFCCs(s1Audio, 8000, 512)
    const audio2MFCC = extractMFCCs(s2Audio, 8000, 512)
    const { bestOffset, maxCorr } = crossCorrelateMFCC(audio1MFCC, audio2MFCC)
    correlationResults.push(maxCorr)
    if (bestOffset === 0 && Math.abs(maxCorr) < 540 * 1000) {
      s2.start = s1Start
      s2.end = s1End
      alignedCount++
      // console.log(
      //   'Aligned:\n',
      //   `${s1.text} ${s1.start} ${s1.end}`,
      //   '\n',
      //   `${s2.text} ${s2.start} ${s2.end}`,
      //   '\n',
      // )
      s1.aligned = s2.id
      s2.aligned = s1.id
    } else {
      // console.log('Not aligned:\t', s2.text, '\t', maxCorr)
      missMatchCount++
    }
  })
  // console.log('Last average:', avgCorr)
  const averageCorrelation =
    correlationResults.reduce((a, b) => a + b, 0) / correlationResults.length
  // console.log('Current average:', averageCorrelation)
  return { alignedCount, averageCorrelation }
}

const alignSubtitleTimes = ({ offsetSec1, offsetSec2, audio1, audio2, sampleRate }) => {
  const session = JSON.parse(fs.readFileSync('./backend/session.json').toString())
  const { data, averageCorrelation } = session
  const { subtitleRows: subtitles1 } = data[0]
  const { subtitleRows: subtitles2 } = data[1]
  const offsetMs1 = offsetSec1 * 1000
  const offsetMs2 = offsetSec2 * 1000
  if (offsetMs1) {
    session.averageCorrelation = processSubtitleRegions(
      subtitles1,
      subtitles2,
      offsetMs1,
      audio1,
      audio2,
      sampleRate,
      averageCorrelation || 540 * 1000,
    )
  } else {
    session.averageCorrelation = processSubtitleRegions(
      subtitles2,
      subtitles1,
      offsetMs2,
      audio2,
      audio1,
      sampleRate,
      averageCorrelation || 540 * 1000,
    )
  }
  const offset1 = offsetSec1 * sampleRate
  const offset2 = offsetSec2 * sampleRate
  data[0] = {
    ...data[0],
    subtitleRows: subtitles1,
    offsetMs: offsetMs1,
    offset: offset1,
    sync: true,
  }
  data[1] = {
    ...data[1],
    subtitleRows: subtitles2,
    offsetMs: offsetMs2,
    offset: offset2,
    sync: true,
  }
  session.data = data
  fs.writeFileSync('./backend/session.json', JSON.stringify(session))
}

const alignSignals = async ({ segment, audio, sampleRate }) => {
  const startTime = process.hrtime()
  const { offsetSeconds, segmentAllAudio, allAudio, maxCorr } = await alignWavFiles({
    segmentObj: segment,
    audioFile: audio,
    sampleRate,
    bufferSize: 512,
  })
  console.log('Best offset:', offsetSeconds)
  const endTime = process.hrtime(startTime)
  const executionTime = endTime[0] + endTime[1] / 1e9
  console.log(`Signals aligned in: ${executionTime}s`)
  return { offsetSeconds, segmentAllAudio, allAudio, maxCorr }
}

const alignSubtitles = async ({ segment, audio, sampleRate, segmentIndex, audioIndex }) => {
  const { offsetSeconds, segmentAllAudio, allAudio, maxCorr } = await alignSignals({
    segment,
    audio,
    sampleRate,
  })
  const actualOffset = offsetSeconds - segment.start
  let offsetSec1, offsetSec2
  if (actualOffset < 0) {
    offsetSec1 = segmentIndex === 0 ? 0 : -actualOffset
    offsetSec2 = audioIndex === 0 ? 0 : -actualOffset
  } else {
    offsetSec1 = segmentIndex === 0 ? actualOffset : 0
    offsetSec2 = audioIndex === 0 ? actualOffset : 0
  }
  const audio1 = segmentIndex === 0 ? segmentAllAudio : allAudio
  const audio2 = audioIndex === 0 ? segmentAllAudio : allAudio
  console.log('MaxCorr', maxCorr)
  const startTime = process.hrtime()
  alignSubtitleTimes({ offsetSec1, offsetSec2, audio1, audio2, sampleRate })
  const endTime = process.hrtime(startTime)
  const executionTime = endTime[0] + endTime[1] / 1e9
  console.log(`All subtitles aligned in: ${executionTime}s`)
  return { offsetSeconds }
}

module.exports = {
  alignSignals,
  extractMFCCs,
  crossCorrelateMFCC,
  alignSubtitles,
}
