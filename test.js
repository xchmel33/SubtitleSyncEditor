const { alignBySubtitleSequence } = require('./backend/align')
const fs = require('fs')

const session = JSON.parse(fs.readFileSync('./backend/session.json').toString())
const { data } = session
const subtitleRef = data[0].subtitleRows[0]

alignBySubtitleSequence(subtitleRef).then(r => console.log('Done:', r))
