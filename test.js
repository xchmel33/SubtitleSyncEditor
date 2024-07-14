const { alignAllSubtitles } = require('./backend/correlate')

alignAllSubtitles().then(r => console.log('Done:', r))
