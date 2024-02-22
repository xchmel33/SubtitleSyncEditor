export default {
  parseSubtitles(subtitles) {
    let id = 0
    return subtitles
      .map(x => x.data)
      .map(x => ({
        ...x,
        id: id++,
        text: x.text.replace(/<[^>]+>/g, ''),
        match: null,
      }))
  },
  compareSubtitles(subtitles1, subtitles2, index) {
    let matched = 0
    subtitles1.forEach((x, i) => {
      const match = subtitles2.find(y => x.text === y.text)
      if (match) {
        matched++
        subtitles1[i].match = {
          videoId: index + 1,
          subtitleId: match.id,
        }
        subtitles2[match.id].match = {
          videoId: index,
          subtitleId: i,
        }
      }
    })
    return matched
  },
}
