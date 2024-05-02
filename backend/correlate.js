const crossCorrelate = (segment, signal) => {
  let maxCorr = -Infinity // Start with a very low correlation score.
  let bestOffset = 0

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

  return { bestOffset, maxCorr: -maxCorr }
}
module.exports = {
  crossCorrelate,
}
