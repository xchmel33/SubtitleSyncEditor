const fs = require('fs')
const { findAudioSegmentOffset } = require('./correlate')
const { getWav } = require('./converter')

const durationMatch = ({ longerSubtitles, shorterSubtitles, subtitleIndex, threshold }) => {
  const sub = shorterSubtitles[subtitleIndex]
  const matchIndex = longerSubtitles.findIndex(s => Math.abs(s.duration - sub.duration) === 0)
  if (matchIndex === -1) return { numMatches: 0, matchIndex }
  let numMatches = 0
  longerSubtitles.slice(matchIndex + 1).some((s, i) => {
    i++
    if (subtitleIndex + i >= shorterSubtitles.length) return true
    const diff = Math.abs(s.duration - shorterSubtitles[subtitleIndex + i].duration)
    if (diff < threshold) {
      numMatches++
      return false
    }
    return true
  })
  return { numMatches, matchIndex }
}

/**
 * Finds the longest sequence of consecutive subtitles where each subtitle has the same duration
 * as its corresponding subtitle in another list, within a specified threshold.
 *
 * This function compares subtitles from two lists ('shorterSubtitles' and 'longerSubtitles') and
 * identifies the starting index and length of the longest sequence where the duration of each subtitle
 * in 'shorterSubtitles' closely matches (within a defined 'durationThreshold') the duration of a subtitle
 * in 'longerSubtitles'.
 *
 * @param {Object} options - Configuration options for the function
 * @param {Object} options.subtitleRef - The subtitle to use as a reference for alignment
 * @param {Array} options.shorterSubtitles - The first list of subtitles to compare
 * @param {Array} options.longerSubtitles - The second list of subtitles to compare
 * @param {number} [options.durationThreshold=0.1] - The maximum allowable difference in duration
 *                                                   between matched subtitles
 * @return {Object} Returns an object with the starting index in 'shorterSubtitles', the corresponding
 *                  starting index in 'longerSubtitles', and the number of consecutive matches in the sequence.
 */
const findLongestSubtitleSequence = ({
  shorterSubtitles,
  longerSubtitles,
  subtitleRef = null,
  durationThreshold = 1,
}) => {
  let subtitleIndex = 0,
    matches = []
  while (subtitleIndex !== shorterSubtitles.length) {
    const { numMatches, matchIndex } = durationMatch({
      longerSubtitles,
      shorterSubtitles,
      subtitleIndex,
      threshold: durationThreshold,
    })
    if (numMatches === 0) {
      subtitleIndex++
      continue
    }
    matches.push({ subtitleIndex, numMatches, matchIndex })
    subtitleIndex += 1
  }
  if (subtitleRef) {
    let subtitleRefIndex = shorterSubtitles.findIndex(
      s =>
        s.start === subtitleRef.start && s.end === subtitleRef.end && s.text === subtitleRef.text,
    )
    if (subtitleRefIndex !== -1) {
      matches = matches.filter(
        m =>
          m.subtitleIndex <= subtitleRefIndex && m.subtitleIndex + m.numMatches > subtitleRefIndex,
      )
    } else {
      subtitleRefIndex = longerSubtitles.findIndex(
        s =>
          s.start === subtitleRef.start && s.end === subtitleRef.end && s.text === subtitleRef.text,
      )
      if (subtitleRefIndex !== -1) {
        matches = matches.filter(
          m => m.matchIndex <= subtitleRefIndex && m.matchIndex + m.numMatches > subtitleRefIndex,
        )
      }
    }
  }
  if (matches.length === 0) {
    return { subtitleIndex: -1, matchIndex: -1, numMatches: 0 }
  }

  return matches.reduce((a, b) => (a.numMatches > b.numMatches ? a : b))
}

/**
 * Method re-times all subtitles returned as the longest sequence of similar subtitles by common durations
 * @param subtitleIndex - Index of the first subtitle in the sequence
 * @param matchIndex - Index of the first matching subtitle in the other list
 * @param numMatches - Number of matching subtitles in the sequence
 * @param shorterSubtitles - List of subtitles to ?
 * @param longerSubtitles - List of subtitles to ?
 * @param offsetSeconds - Offset in seconds to apply to the ? subtitles
 * @param durationThreshold - Threshold for the difference in duration between subtitles
 * @return {{shorterSubtitles, longerSubtitles}} - Returns the re-timed aligned subtitles
 */
const reTimeSubtitles = ({
  subtitleIndex,
  matchIndex,
  numMatches,
  shorterSubtitles,
  longerSubtitles,
  offsetSeconds,
  durationThreshold = 0.1,
}) => {
  const offsetMs = offsetSeconds * 1000
  Array.from({ length: numMatches }).forEach((_, i) => {
    const shorterSubtitle = shorterSubtitles[subtitleIndex + i]
    const longerSubtitle = longerSubtitles[matchIndex + i]
    if (Math.abs(shorterSubtitle.start + offsetMs - longerSubtitle.start) < durationThreshold) {
      longerSubtitle.start = shorterSubtitle.start + offsetMs
      longerSubtitle.end = shorterSubtitle.end + offsetMs
    }
    shorterSubtitle.aligned = longerSubtitle.id
    longerSubtitle.aligned = shorterSubtitle.id
  })
  return { shorterSubtitles, longerSubtitles }
}

/**
 * Aligns subtitles of two video files by finding the longest sequence of subtitles based on the similarities in their durations
 * @param sampleRate - Sample rate of audio
 * @param subtitleRef - Reference subtitle to align the subtitles by
 * @return {Promise<{offsetSeconds: number, subtitleIndex: number, matchIndex: number, numMatches: number}>} - Returns the offset in seconds and the indices of the longest sequence of subtitles
 */
const alignBySubtitleSequence = async (subtitleRef = null, sampleRate = 8000) => {
  const session = JSON.parse(fs.readFileSync('./backend/session.json').toString())
  const { data } = session
  let sI = 0
  let lI = 1
  if (data[sI].subtitleRows.length > data[lI].subtitleRows.length) {
    sI = 1
    lI = 0
  }
  const shorterSubtitles = data[sI]
  const longerSubtitles = data[lI]

  console.log('Shorter:', shorterSubtitles.subtitleRows.length)
  console.log('Longer:', longerSubtitles.subtitleRows.length)

  const { subtitleIndex, matchIndex, numMatches } = findLongestSubtitleSequence({
    shorterSubtitles: shorterSubtitles.subtitleRows,
    longerSubtitles: longerSubtitles.subtitleRows,
    subtitleRef,
    durationThreshold: 0.1,
  })
  console.log('Longest sequence at ', subtitleIndex, matchIndex, 'with ', numMatches, ' matches')
  if (subtitleIndex === -1) {
    return { offsetSeconds: 0, subtitleIndex, matchIndex, numMatches }
  }

  const segmentStart = shorterSubtitles.subtitleRows[subtitleIndex].start / 1000
  const { offsetSeconds } = await findAudioSegmentOffset({
    segmentObj: {
      start: segmentStart,
      duration: parseFloat(shorterSubtitles.subtitleRows[subtitleIndex].duration),
      file: await getWav(shorterSubtitles.videoFile, sampleRate),
    },
    audioFile: await getWav(longerSubtitles.videoFile, sampleRate),
    sampleRate,
  })
  const actualOffset = offsetSeconds - segmentStart

  const { shorterSubtitles: newShorterSubtitles, longerSubtitles: newLongerSubtitles } =
    reTimeSubtitles({
      subtitleIndex,
      matchIndex,
      numMatches,
      shorterSubtitles: shorterSubtitles.subtitleRows,
      longerSubtitles: longerSubtitles.subtitleRows,
      offsetSeconds: actualOffset,
    })
  const shortOffset = actualOffset > 0 ? actualOffset : 0
  const longOffset = actualOffset < 0 ? -actualOffset : 0
  data[sI] = {
    ...data[sI],
    subtitleRows: newShorterSubtitles,
    sync: true,
    offset: shortOffset * sampleRate,
    offsetMs: shortOffset * 1000,
  }
  data[lI] = {
    ...data[lI],
    subtitleRows: newLongerSubtitles,
    sync: true,
    offset: longOffset * sampleRate,
    offsetMs: longOffset * 1000,
  }
  session.data = data
  fs.writeFileSync('./backend/session.json', JSON.stringify(session, null, 2))
  return {
    offsetSeconds: longOffset || shortOffset,
    subtitleIndex,
    matchIndex,
    numMatches,
    index: shortOffset ? sI : lI,
  }
}

module.exports = { alignBySubtitleSequence }
