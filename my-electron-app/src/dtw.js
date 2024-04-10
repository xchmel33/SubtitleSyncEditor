import DTW from 'dtw'
export const getSoundArray = videoElement => {
  const audioCtx = new AudioContext()
  const analyser = audioCtx.createAnalyser()
  const source = audioCtx.createMediaElementSource(videoElement)
  source.connect(analyser)
  analyser.connect(audioCtx.destination)
  analyser.fftSize = 2048
  const bufferLength = analyser.frequencyBinCount
  return new Uint8Array(bufferLength)
}

// function that will return object of matched audio arrays based on dtw
export const getMatchedSubtitles = audios => {
  if (!audios.length) return []
  const dtw = new DTW(undefined)
  console.log('dtw', dtw)
}
export const detectSpeech = videoElement => {
  // Create an AudioContext
  const audioContext = new (window.AudioContext || window.webkitAudioContext)()

  // Create a MediaElementSource from the video element
  const source = audioContext.createMediaElementSource(videoElement)

  // Create an AnalyserNode to analyze the audio
  const analyser = audioContext.createAnalyser()
  analyser.fftSize = 2048 // Size of the FFT for frequency-domain analysis
  const bufferLength = analyser.frequencyBinCount
  const dataArray = new Uint8Array(bufferLength)

  // Connect the source to the analyser and the analyser to the destination
  source.connect(analyser)
  analyser.connect(audioContext.destination)

  const detect = () => {
    // Get the frequency data from the analyser
    analyser.getByteFrequencyData(dataArray)

    // Simple analysis to detect variations in audio
    // This is where you'd add more complex logic to detect speech
    let sum = 0
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i]
    }
    const average = sum / bufferLength

    // Example threshold to indicate "speech detected"
    if (average > 50) {
      console.log('Speech Detected')
    } else {
      console.log('No Speech Detected')
    }

    // Keep analyzing audio
    requestAnimationFrame(detect)
  }
  videoElement.currentTime = 0
  videoElement.play()
  detect()
}
