import * as pdfjsLib from 'pdfjs-dist'
import exifr from 'exifr'

import { extractLocationMetadata } from './locationMetadata'
import { extractVisualLocation } from './visualLocation'
import {
  addIfPresent,
  formatBytes,
  formatDate,
  formatValue,
  getFileExtension
} from './formatters'

pdfjsLib.GlobalWorkerOptions.workerSrc =
  `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

const EXIF_OPTIONS = {
  tiff: true,
  exif: true,
  gps: true,
  xmp: true,
  iptc: true,
  jfif: true,
  ihdr: true,
  translateValues: true,
  mergeOutput: true
}

function readImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      const width = img.naturalWidth
      const height = img.naturalHeight
      URL.revokeObjectURL(url)
      resolve({ width, height, aspectRatio: `${(width / height).toFixed(3)}:1` })
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Unable to read image dimensions.'))
    }

    img.src = url
  })
}

async function getImageMetadata(file) {
  const dimensions = await readImageDimensions(file)

  let exif = {}
  try {
    exif = await exifr.parse(file, EXIF_OPTIONS)
  } catch (error) {
    console.warn('Embedded image metadata could not be read:', error)
  }

  return { dimensions, exif: exif || {} }
}

async function getPdfMetadata(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  let info = {}
  try {
    const result = await pdf.getMetadata()
    info = result?.info || {}
  } catch {
    // Some PDFs expose no metadata.
  }

  return {
    pageCount: pdf.numPages,
    title: info.Title,
    author: info.Author,
    subject: info.Subject,
    keywords: info.Keywords,
    creator: info.Creator,
    producer: info.Producer,
    creationDate: info.CreationDate,
    modificationDate: info.ModDate,
    pdfVersion: info.PDFFormatVersion
  }
}

function buildFileSection(file) {
  return {
    '--- FILE ---': '',
    'File Name': file.name,
    'File Extension': getFileExtension(file.name),
    'File Type': file.type || 'Unknown',
    'File Size': formatBytes(file.size),
    'File Size (bytes)': file.size.toLocaleString(),
    'Local File Modified': formatDate(file.lastModified)
  }
}

function buildImageSection(dimensions, exif) {
  const section = {
    '--- IMAGE ---': '',
    'Image Width': `${dimensions.width}px`,
    'Image Height': `${dimensions.height}px`,
    'Resolution': `${dimensions.width} × ${dimensions.height}px`,
    'Aspect Ratio': dimensions.aspectRatio
  }

  const cameraFields = [
    ['Camera Make', exif.Make],
    ['Camera Model', exif.Model],
    ['Lens Make', exif.LensMake],
    ['Lens Model', exif.LensModel],
    ['ISO', exif.ISO],
    ['F-Number', exif.FNumber],
    ['Exposure Time', exif.ExposureTime],
    ['Focal Length', exif.FocalLength],
    ['Orientation', exif.Orientation],
    ['Software', exif.Software]
  ]

  for (const [label, value] of cameraFields) {
    addIfPresent(section, label, value)
  }

  addIfPresent(
    section,
    'Original Capture Date',
    exif.DateTimeOriginal,
    exif.CreateDate,
    exif.DateTimeDigitized
  )
  addIfPresent(section, 'Image Description', exif.ImageDescription, exif.Description)
  addIfPresent(section, 'Artist', exif.Artist)
  addIfPresent(section, 'Copyright', exif.Copyright)

  return section
}

function buildPdfSection(pdfData) {
  return {
    '--- PDF DOCUMENT ---': '',
    'Page Count': pdfData.pageCount,
    'PDF Version': formatValue(pdfData.pdfVersion),
    'Title': formatValue(pdfData.title),
    'Author': formatValue(pdfData.author),
    'Subject': formatValue(pdfData.subject),
    'Keywords': formatValue(pdfData.keywords),
    'Creator': formatValue(pdfData.creator),
    'Producer': formatValue(pdfData.producer),
    'PDF Creation Date': formatDate(pdfData.creationDate),
    'PDF Modification Date': formatDate(pdfData.modificationDate)
  }
}

function buildFallbackSection() {
  return {
    '--- FILE ---': '',
    'Specialized Metadata':
      'No specialized parser is currently enabled for this file type.'
  }
}

async function analyzeImage(file) {
  const { dimensions, exif } = await getImageMetadata(file)
  const imageSection = buildImageSection(dimensions, exif)

  const location = extractLocationMetadata(exif)
  if (Object.keys(location).length > 0) {
    imageSection['--- LOCATION / GPS ---'] = ''
    Object.assign(imageSection, location)
  }

  const visualLocation = await extractVisualLocation(file)
  if (Object.keys(visualLocation).length > 0) {
    imageSection['--- VISUAL LOCATION INFORMATION ---'] = ''
    Object.assign(imageSection, visualLocation)
  }

  imageSection['--- LOCATION ANALYSIS ---'] = ''
  imageSection['Embedded metadata'] =
    Object.keys(location).length > 0
      ? 'Location metadata found in the file.'
      : 'No embedded location metadata found.'
  imageSection['Visual location information'] =
    Object.keys(visualLocation).length > 0
      ? 'Location-related information detected in the visible image.'
      : 'No additional location-related visual information detected.'

  return imageSection
}

/**
 * Analyze a file and return the full, flattened metadata map.
 * Preserves insertion order so sections read naturally.
 */
export async function analyzeFile(file) {
  const base = buildFileSection(file)
  const extension = getFileExtension(file.name)

  const additional =
    file.type.startsWith('image/')
      ? await analyzeImage(file)
      : file.type === 'application/pdf' || extension === '.pdf'
        ? buildPdfSection(await getPdfMetadata(file))
        : buildFallbackSection()

  return { ...base, ...additional }
}
