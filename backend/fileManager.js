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
  if (files.some(f => f.path === file.path) || !file?.path) return false
  files.push(file)
  fs.writeFileSync('./backend/files.json', JSON.stringify(files, null, 2))
  console.log(`File saved: ${file.path}`)
  return true
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

const saveVariant = (file, variant, chain = true) => {
  if (!file.path || !variant.path) return
  const data = getFiles()
  const index = data.findIndex(f => f.path === file.path)
  if (index === -1) {
    saveFile(file)
    saveVariant(file, variant, chain)
    return
  }
  if (!data[index].variants) data[index].variants = []
  if (!data[index].variants.map(x => x.path).includes(variant.path))
    data[index].variants.push(variant)
  fs.writeFileSync('./backend/files.json', JSON.stringify(data, null, 2))
  console.log(`File ${file.path} variant saved: ${variant.path}`)
  if (chain) saveVariant(variant, file, false)
}

const addTime = (path, time) => {
  const data = getFiles()
  const index = data.findIndex(f => f.path === path)
  if (index === -1) return
  data[index].time = time
  fs.writeFileSync('./backend/files.json', JSON.stringify(data, null, 2))
}

const deleteVariant = (file, variantPaths) => {
  const data = getFiles()
  let newData = []
  data.forEach(f => {
    if (f.variants) {
      f.variants = f.variants.filter(v => !variantPaths.includes(v.path))
    }
    if (f.variants) {
      f.variants = f.variants.filter(v => v.path !== f.path)
    }
    newData.push(f)
  })
  fs.writeFileSync('./backend/files.json', JSON.stringify(newData, null, 2))
  return variantPaths.filter(v => v !== file.path).pop(0)
}

module.exports = { getFiles, saveFile, getVariants, saveVariant, addTime, deleteVariant }
