const convertVideoPathToWav = filepath => {
  // Replace all slashes and backslashes with underscores
  let filename = filepath.replace(/[/\\]/g, '_')

  // remove invalid characters
  filename = filename.replace(/[^a-zA-Z0-9_.-]/g, '')

  // Change the file extension to .wav
  filename = filename.replace(/\.\w+$/, '.wav')

  if (filename.startsWith('_')) {
    filename = filename.slice(1)
  }

  return filename
}

// Example usage
const path1 =
  'C:\\Users\\lukXmelo\\Documents\\GitHub\\subSyncEditor\\videos\\Maids.S01E01.1080p.WEB-DL.H264.AAC-AppleTor.mp4'
const path2 = '\\media\\videos\\video1.mp4'
const newFilename = convertVideoPathToWav(path1)
const newFilename2 = convertVideoPathToWav(path2)
console.log(newFilename) // Output: _media_videos_video1.wav
console.log(newFilename2) // Output: _media_videos_video1.wav
