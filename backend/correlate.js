const crossCorrelate = (segment, signal, average = 0) => {
  let maxCorr = -Infinity // Start with a very low correlation score.
  let bestOffset = 0

  if (average > 0) {
    signal = averageSamples(applyLowPassFilter(signal), average)
    segment = averageSamples(applyLowPassFilter(segment), average)
  }

  for (let offset = 0; offset <= signal.length - segment.length; offset++) {
    let sum = 0

    for (let i = 0; i < segment.length; i++) {
      // Calculate squared difference
      let diff = segment[i] - signal[i + offset]
      sum -= diff * diff // Subtract to simulate correlation (minimizing distance)
    }

    // We look for the maximum since sum is negative (maximally less negative is better)
    if (sum > maxCorr) {
      maxCorr = sum
      bestOffset = offset
    }
  }
  console.log('Best offset: ', bestOffset)
  return { bestOffset, maxCorr: -maxCorr }
}

const averageSamples = (samples, every = 5) => {
  const result = []
  for (let i = 0; i < samples.length; i += every) {
    let sum = 0
    for (let j = 0; j < every; j++) {
      sum += samples[i + j]
    }
    result.push(sum / every)
  }
  return result
}
const applyLowPassFilter = (samples, filterSize = 5) => {
  const result = new Array(samples.length).fill(0)
  for (let i = 0; i < samples.length; i++) {
    let sum = 0
    for (let j = 0; j < filterSize; j++) {
      if (i - j >= 0) {
        sum += samples[i - j]
      }
    }
    result[i] = sum / filterSize
  }
  return result
}

module.exports = {
  crossCorrelate,
}
