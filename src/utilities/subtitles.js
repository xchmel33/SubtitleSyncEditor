import { uniqueId } from '@/utilities/helpers'

export const parseSubtitles = subtitles => {
  return subtitles
    .map(x => x.data)
    .map(x => ({
      ...x,
      id: uniqueId(),
      text: x.text.replace(/<[^>]+>/g, ''),
      match: null,
      duration: (x.end - x.start) / 1000,
    }))
}

export const formatSubtitles = subtitles => {
  return subtitles.map(x => ({
    type: 'cue',
    data: {
      start: x.start,
      end: x.end,
      text: x.text,
    },
  }))
}
export const compareSubtitlesByText = ({ subtitles1, subtitles2, index, toMatchIndex }) => {
  let matched = 0
  subtitles1.forEach((x, i) => {
    const match = subtitles2.find(y => x.text === y.text)
    if (match) {
      matched++
      subtitles1[i].match = {
        videoId: toMatchIndex,
        subtitleId: match.id,
      }
      subtitles2[match.id].match = {
        videoId: index,
        subtitleId: x.id,
      }
    }
  })
  return matched
}

export const compareSubtitlesByTime = ({ subtitles1, subtitles2, index, toMatchIndex }) => {
  let matched = 0
  let { subtitleRows: subtitleRows1, offsetMs: offsetMs1 } = subtitles1
  let { subtitleRows: subtitleRows2, offsetMs: offsetMs2 } = subtitles2
  subtitleRows1.forEach((x, i) => {
    const match = subtitleRows2.find(
      y =>
        Math.abs(x.start + (offsetMs1 || 0)) - (y.start + (offsetMs2 || 0)) <= 10 &&
        Math.abs(x.end + (offsetMs1 || 0)) - (y.end + (offsetMs2 || 0)) <= 10,
    )
    if (match) {
      matched++
      subtitleRows1[i].match = {
        videoId: toMatchIndex,
        subtitleId: match.id,
      }
      subtitleRows2[match.id].match = {
        videoId: index,
        subtitleId: x.id,
      }
    }
  })
  return matched
}

export const adjustSubtitleTimes = ({ subtitleToAdd, after, nextSubtitle }) => {
  const A = after.end - after.start
  const B = subtitleToAdd.end - subtitleToAdd.start
  const C = nextSubtitle.end - subtitleToAdd.start
  const y = (A + C - B) / ((A * A) / C + C)
  const x = (A / C) * y
  const newAfterDuration = A * x
  const newNextDuration = C * y
  after.end = after.start + newAfterDuration
  nextSubtitle.start = nextSubtitle.end - newNextDuration
  subtitleToAdd.start = after.end + 10
  subtitleToAdd.end = nextSubtitle.start - 10
}
