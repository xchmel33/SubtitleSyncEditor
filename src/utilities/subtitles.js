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
