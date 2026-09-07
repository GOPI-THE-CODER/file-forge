const EMPTY_VALUE = 'Not available'
const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB']

export function formatBytes(bytes) {
  if (!bytes) return '0 B'

  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    BYTE_UNITS.length - 1
  )

  return `${(bytes / Math.pow(1024, index)).toFixed(2)} ${BYTE_UNITS[index]}`
}

export function formatDate(value) {
  if (!value) return EMPTY_VALUE

  try {
    const date = value instanceof Date ? value : new Date(value)
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString()
  } catch {
    return String(value)
  }
}

export function formatValue(value) {
  if (value === undefined || value === null || value === '') {
    return EMPTY_VALUE
  }

  if (value instanceof Date) {
    return formatDate(value)
  }

  if (Array.isArray(value)) {
    return value.join(', ')
  }

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }

  return String(value)
}

export function getFileExtension(name) {
  const parts = name.split('.')

  if (parts.length < 2) return 'None'

  return `.${parts.pop().toLowerCase()}`
}

export function hasUsefulValue(value) {
  if (value === undefined || value === null || value === '') {
    return false
  }

  if (typeof value === 'string' && value.trim() === '') {
    return false
  }

  return true
}

export function addIfPresent(target, label, ...values) {
  for (const value of values) {
    if (hasUsefulValue(value)) {
      target[label] = formatValue(value)
      return
    }
  }
}

export function findFirstValue(object, keys) {
  if (!object) return undefined

  for (const key of keys) {
    if (
      Object.prototype.hasOwnProperty.call(object, key) &&
      hasUsefulValue(object[key])
    ) {
      return object[key]
    }
  }

  return undefined
}
