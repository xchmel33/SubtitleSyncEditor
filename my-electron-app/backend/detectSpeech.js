const fs = require('fs').promises
const ffmpeg = require('fluent-ffmpeg')
const path = require('path')

const extractAudioFromVideo = async (videoFilePath, audioOutputPath) => {
  // First, extract the audio from the video
  await new Promise((resolve, reject) => {
    ffmpeg(videoFilePath)
      .output(audioOutputPath)
      .audioCodec('pcm_s16le') // Output to WAV format for compatibility
      .on('end', () => {
        console.log('Audio extraction completed.')
        resolve()
      })
      .on('error', err => {
        console.error('Error:', err)
        reject(err)
      })
      .run()
  })

  const { default: decodeAudio } = await import('audio-decode')

  const audioBuffer = await fs.readFile(audioOutputPath)
  return new Promise((resolve, reject) => {
    decodeAudio(audioBuffer, (err, audioData) => {
      if (err) {
        console.error('Error decoding audio:', err)
        reject(err)
      } else {
        console.log('Audio decoding completed.')
        resolve(audioData)
      }
    })
  })
}
;(async () => {
  const videoFilePath = path.resolve('videos/ai_story_long_effects.mp4')
  const audioOutputPath = videoFilePath.replace('.mp4', '.wav')
  const audioData = await extractAudioFromVideo(videoFilePath, audioOutputPath)
  console.log('Decoded audio data:', audioData)
})()
