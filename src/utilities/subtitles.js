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
  // debugger
  let matched = 0
  let { subtitleRows: subtitleRows1, offsetMs: offsetMs1 } = subtitles1
  let { subtitleRows: subtitleRows2, offsetMs: offsetMs2 } = subtitles2
  subtitleRows1.forEach((x, i) => {
    const match = subtitleRows2.find(y => {
      const diffStart = Math.abs(x.start + (offsetMs1 || 0) - (y.start + (offsetMs2 || 0)))
      const diffEnd = Math.abs(x.end + (offsetMs1 || 0) - (y.end + (offsetMs2 || 0)))
      if (diffStart <= 100 && diffEnd <= 100) {
        console.log(`Match ${x.text}: `, diffStart, diffEnd)
        return true
      }
      return false
    })
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

// export const alignSubtitleTimes = data => {
//   const { subtitleRows: subtitles1, offsetMs: offsetMs1 } = data[0]
//   const { subtitleRows: subtitles2, offsetMs: offsetMs2 } = data[1]
//   subtitles1.forEach(s1 => {
//     const s2 = subtitles2.find(y => s1.text === y.text)
//     if (!s2) return
//     console.log('Aligning: ', s1.text, s2.text)
//     let newStart, newEnd
//     const s1Start = s1.start + offsetMs1 || 0
//     const s1End = s1.end + offsetMs1 || 0
//     const s2Start = s2.start + offsetMs2 || 0
//     const s2End = s2.end + offsetMs2 || 0
//     if (s1Start <= s2Start && s1End >= s2Start) {
//       // newStart = s1Start + Math.abs(s2Start - s1Start) / 2
//       // newEnd = s1End + Math.abs(s2End - s1End) / 2
//       newStart = s1Start
//       newEnd = s1End
//     } else if (s1Start <= s2End && s1End >= s2End) {
//       // newStart = s2Start + Math.abs(s2Start - s1Start) / 2
//       // newEnd = s2End + Math.abs(s1End - s2End) / 2
//       newStart = s1Start
//       newEnd = s1End
//     }
//     if (!newStart || !newEnd) return
//     s1.start = newStart - (offsetMs1 || 0)
//     s1.end = newEnd - (offsetMs1 || 0)
//     s2.start = newStart - (offsetMs2 || 0)
//     s2.end = newEnd - (offsetMs2 || 0)
//   })
// }

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
