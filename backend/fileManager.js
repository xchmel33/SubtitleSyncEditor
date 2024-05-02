const fs = require('fs')

const getFiles = () => {
  if (!fs.existsSync('./backend/files.json')) {
    fs.writeFileSync('./backend/files.json', JSON.stringify([]))
  }
  const files = fs.readFileSync('./backend/files.json')
  return JSON.parse(files.toString()) || []
}

const saveFile = file => {
  const files = getFiles()
  if (files.some(f => f.path === file.path)) return
  files.push(file)
  fs.writeFileSync('./backend/files.json', JSON.stringify(files, null, 2))
}

const getVariants = file => {
  const data = getFiles()
  const index = data.findIndex(f => f.path === file)
  if (index === -1) {
    file.variants = []
    saveFile(file)
    return []
  }
  let variants = data[index].variants
  if (!variants) {
    data[index].variants = []
    saveFile(file)
    return []
  }
  return variants
}

const saveVariant = (file, variant) => {
  const data = getFiles()
  const index = data.findIndex(f => f.path === file.path)
  if (index === -1) {
    file.variants = []
    saveFile(file)
    return
  }
  if (!data[index].variants) data[index].variants = []
  if (!data[index].variants.includes(variant)) data[index].variants.push(variant)
  fs.writeFileSync('./backend/files.json', JSON.stringify(data, null, 2))
}

module.exports = { getFiles, saveFile, getVariants, saveVariant }
