export const getFilename = path => {
  if (!path) return ''
  const parts = path.split(/[/\\]/)
  if (parts.length === 0) return path
  return parts.pop()
}

// round number to fixed decimal places
export const numFixed = (num, fixed) => {
  if (!num) return 0
  return Number(num).toFixed(fixed)
}

export const timestamp = () => {
  const date = new Date()
  return `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`
}

export const uniqueId = () => {
  return Math.random().toString(36).substr(2, 9)
}

export const lastItem = arr => arr[arr.length - 1]

export const cleanObject = (obj, keyBlacklist) => {
  const cleaned = {}
  Object.keys(obj).forEach(key => {
    if (!keyBlacklist.includes(key)) {
      if (Array.isArray(obj[key])) {
        cleaned[key] = cleanArray(obj[key], keyBlacklist)
      } else if (obj[key] !== null && typeof obj[key] === 'object') {
        cleaned[key] = cleanObject(obj[key], keyBlacklist)
      } else {
        cleaned[key] = obj[key]
      }
    }
  })
  return cleaned
}

export const cleanArray = (arr, keyBlacklist) =>
  arr.map(item => {
    if (Array.isArray(item)) {
      return cleanArray(item, keyBlacklist)
    } else if (item !== null && typeof item === 'object') {
      return cleanObject(item, keyBlacklist)
    } else {
      return item
    }
  })

export const localPath = async ({ service, path }) => {
  const cwd = await service.sendMessage('cwd', {}, { method: 'GET' })
  console.log('cwd', cwd)
  return path.replace(cwd, '.')
}

export const compareObjects = (obj1, obj2) => {
  obj1 = typeof obj1 === 'string' ? obj1 : JSON.stringify(obj1)
  obj2 = typeof obj2 === 'string' ? obj2 : JSON.stringify(obj2)
  return obj1 === obj2
}

export const smartSplit = text => {
  let chunks = text.split(/(?<=\w[.,!?])\s/)

  if (chunks.length <= 1 || !/[.,!?]/.test(text)) {
    chunks = text.split(' ')
  }

  const middleIndex = Math.floor(chunks.length / 2)
  return [chunks.slice(0, middleIndex).join(' '), chunks.slice(middleIndex).join(' ')]
}