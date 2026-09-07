import { createWorker } from 'tesseract.js'

const COORDINATE_PATTERN =
  /[-+]?\d{1,3}(?:\.\d+)?\s*[,;/]\s*[-+]?\d{1,3}(?:\.\d+)?/

const LABELED_LOCATIONS = [
  {
    key: 'Place / Location',
    patterns: [/^place\s*[:-]/i, /^location\s*[:-]/i, /^venue\s*[:-]/i]
  },
  {
    key: 'City',
    patterns: [/^city\s*[:-]/i, /^town\s*[:-]/i]
  },
  {
    key: 'District',
    patterns: [/^district\s*[:-]/i]
  },
  {
    key: 'State / Province',
    patterns: [/^state\s*[:-]/i, /^province\s*[:-]/i]
  },
  {
    key: 'Country',
    patterns: [/^country\s*[:-]/i]
  },
  {
    key: 'Address',
    patterns: [/^address\s*[:-]/i, /^addr\s*[:-]/i]
  }
]

const LOCATION_KEYWORDS = [
  'district',
  'state',
  'province',
  'country',
  'city',
  'town',
  'village',
  'road',
  'street',
  'address',
  'location',
  'locality',
  'mandal',
  'taluk',
  'tehsil',
  'county',
  'region'
]

function extractCoordinates(lines) {
  const coordinateLine = lines.find((line) => COORDINATE_PATTERN.test(line))

  if (!coordinateLine) return {}

  const result = {}
  const match = coordinateLine.match(COORDINATE_PATTERN)

  if (match) {
    result['Coordinates detected visually'] = match[0]
  }

  const index = lines.indexOf(coordinateLine)
  const nearby = lines.slice(
    Math.max(0, index - 2),
    Math.min(lines.length, index + 3)
  )

  if (nearby.length > 0) {
    result['Text surrounding coordinates'] = nearby.join(' | ')
  }

  return result
}

function extractLabeledLocations(lines) {
  const result = {}

  for (const rule of LABELED_LOCATIONS) {
    for (const line of lines) {
      if (!rule.patterns.some((pattern) => pattern.test(line))) continue

      const value = line.replace(/^[^:-]+[:-]\s*/i, '').trim()

      if (value) {
        result[`${rule.key} detected visually`] = value
        break
      }
    }
  }

  return result
}

function extractKeywordLocations(lines) {
  const keywordLines = lines.filter((line) => {
    const lower = line.toLowerCase()
    return LOCATION_KEYWORDS.some((keyword) => lower.includes(keyword))
  })

  if (keywordLines.length === 0) return {}

  return {
    'Location-related text detected visually': keywordLines.join(' | ')
  }
}

export async function extractVisualLocation(file) {
  let worker = null

  try {
    worker = await createWorker('eng')
    const { data } = await worker.recognize(file)

    const rawText = data?.text?.trim() || ''
    if (!rawText) return {}

    const lines = rawText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)

    return {
      ...extractCoordinates(lines),
      ...extractLabeledLocations(lines),
      ...extractKeywordLocations(lines)
    }
  } catch (error) {
    console.warn('Visual location detection failed:', error)
    return {}
  } finally {
    if (worker && typeof worker.terminate === 'function') {
      try {
        await worker.terminate()
      } catch {
        // Ignore worker cleanup errors.
      }
    }
  }
}
