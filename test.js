const { stringifySync } = require('subtitle')
const fs = require('fs')

const saveSubtitles = (subtitles, outputFilePath, format = 'SRT') => {
  subtitles = subtitles.map(x => ({
    type: 'cue',
    data: x,
  }))
  const srtString = stringifySync(subtitles, { format })
  console.log(srtString)
  fs.writeFileSync(outputFilePath, srtString)
}

const subtitles = [
  {
    start: 0,
    end: 5000,
    text: 'Hello, world!',
  },
  {
    start: 5000,
    end: 10000,
    text: 'This is a test subtitle.',
  },
]

// saveSrtSubtitles(subtitles, './subtitles.srt')
saveSrtSubtitles(subtitles, './subtitles.vtt')
