import { useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import exifr from 'exifr'
import { createWorker } from 'tesseract.js'

// PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

export default function FileMetadataViewer() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [metadata, setMetadata] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B'

    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    const index = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      units.length - 1
    )

    return `${(bytes / Math.pow(1024, index)).toFixed(2)} ${units[index]}`
  }

  const formatDate = (value) => {
    if (!value) return 'Not available'

    try {
      const date = value instanceof Date
        ? value
        : new Date(value)

      if (Number.isNaN(date.getTime())) {
        return String(value)
      }

      return date.toLocaleString()
    } catch {
      return String(value)
    }
  }

  const formatValue = (value) => {
    if (
      value === undefined ||
      value === null ||
      value === ''
    ) {
      return 'Not available'
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

  const getFileExtension = (name) => {
    const parts = name.split('.')

    if (parts.length < 2) {
      return 'None'
    }

    return `.${parts.pop().toLowerCase()}`
  }

  const getImageDimensions = (file) => {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file)
      const img = new Image()

      img.onload = () => {
        const width = img.naturalWidth
        const height = img.naturalHeight

        URL.revokeObjectURL(url)

        resolve({
          width,
          height,
          aspectRatio:
            `${(width / height).toFixed(3)}:1`
        })
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(
          new Error(
            'Unable to read image dimensions.'
          )
        )
      }

      img.src = url
    })
  }

  /*
   * Remove empty values.
   *
   * This prevents the Metadata Viewer from becoming
   * a huge list of "Not available" entries.
   */
  const hasUsefulValue = (value) => {
    if (
      value === undefined ||
      value === null ||
      value === ''
    ) {
      return false
    }

    if (
      typeof value === 'string' &&
      value.trim() === ''
    ) {
      return false
    }

    return true
  }

  const addIfPresent = (
    target,
    label,
    ...values
  ) => {
    for (const value of values) {
      if (hasUsefulValue(value)) {
        target[label] = formatValue(value)
        return
      }
    }
  }

  /*
   * Search an object for multiple possible metadata
   * field names.
   */
  const findFirstValue = (
    object,
    keys
  ) => {
    if (!object) return undefined

    for (const key of keys) {
      if (
        Object.prototype.hasOwnProperty.call(
          object,
          key
        ) &&
        hasUsefulValue(object[key])
      ) {
        return object[key]
      }
    }

    return undefined
  }

  /*
   * Extract location information from EXIF/XMP/IPTC
   * using many commonly-used field names.
   */
  const extractLocationMetadata = (exif) => {
    const location = {}

    const latitude =
      findFirstValue(exif, [
        'latitude',
        'Latitude',
        'GPSLatitude',
        'GPSLatitudeRef'
      ])

    const longitude =
      findFirstValue(exif, [
        'longitude',
        'Longitude',
        'GPSLongitude'
      ])

    const altitude =
      findFirstValue(exif, [
        'GPSAltitude',
        'Altitude'
      ])

    const direction =
      findFirstValue(exif, [
        'GPSImgDirection',
        'GPSDirection',
        'ImageDirection'
      ])

    const gpsDate =
      findFirstValue(exif, [
        'GPSDateStamp',
        'GPSTimeStamp',
        'GPSTime'
      ])

    /*
     * Standard IPTC/XMP location names.
     */
    const city =
      findFirstValue(exif, [
        'City',
        'city',
        'LocationCity',
        'LocationShownCity',
        'Sub-location',
        'Sublocation',
        'Location',
        'LocationName'
      ])

    const subLocation =
      findFirstValue(exif, [
        'Sub-location',
        'Sublocation',
        'SubLocation',
        'LocationShownSublocation',
        'LocationShownSubLocation'
      ])

    const district =
      findFirstValue(exif, [
        'District',
        'district',
        'LocationDistrict',
        'SubLocation'
      ])

    const state =
      findFirstValue(exif, [
        'State',
        'Province',
        'StateProvince',
        'ProvinceState',
        'LocationShownProvinceState',
        'LocationShownState'
      ])

    const country =
      findFirstValue(exif, [
        'Country',
        'CountryName',
        'Country-PrimaryLocationName',
        'LocationShownCountryName'
      ])

    const countryCode =
      findFirstValue(exif, [
        'CountryCode',
        'Country-PrimaryLocationCode',
        'CountryCodeName'
      ])

    const description =
      findFirstValue(exif, [
        'LocationDescription',
        'LocationDesc',
        'ImageDescription',
        'Description',
        'Caption-Abstract'
      ])

    addIfPresent(
      location,
      'GPS Latitude',
      latitude
    )

    addIfPresent(
      location,
      'GPS Longitude',
      longitude
    )

    addIfPresent(
      location,
      'GPS Altitude',
      altitude
    )

    addIfPresent(
      location,
      'GPS Direction',
      direction
    )

    addIfPresent(
      location,
      'GPS Date / Time',
      gpsDate
    )

    addIfPresent(
      location,
      'City / Locality',
      city
    )

    addIfPresent(
      location,
      'Sub-location',
      subLocation
    )

    addIfPresent(
      location,
      'District',
      district
    )

    addIfPresent(
      location,
      'State / Province',
      state
    )

    addIfPresent(
      location,
      'Country',
      country
    )

    addIfPresent(
      location,
      'Country Code',
      countryCode
    )

    addIfPresent(
      location,
      'Location Description',
      description
    )

    return location
  }

  /*
   * Visual location detection.
   *
   * This is NOT intended to become the normal OCR tool.
   * We only retain text that looks like useful location
   * information.
   */
  const extractVisualLocation = async (file) => {
    let worker = null

    try {
      worker = await createWorker('eng')

      const { data } =
        await worker.recognize(file)

      const rawText =
        data?.text?.trim() || ''

      if (!rawText) {
        return {}
      }

      const lines =
        rawText
          .split(/\r?\n/)
          .map(line => line.trim())
          .filter(Boolean)

      const location = {}

      /*
       * Coordinate detection.
       *
       * Supports decimal latitude/longitude and
       * common coordinate-looking text.
       */
      const coordinatePattern =
        /[-+]?\d{1,3}(?:\.\d+)?\s*[,;/]\s*[-+]?\d{1,3}(?:\.\d+)?/

      const coordinateLine =
        lines.find(line =>
          coordinatePattern.test(line)
        )

      if (coordinateLine) {
        const match =
          coordinateLine.match(
            coordinatePattern
          )

        if (match) {
          location[
            'Coordinates detected visually'
          ] = match[0]
        }
      }

      /*
       * Detect common location labels.
       */
      const locationPatterns = [
        {
          key: 'Place / Location',
          patterns: [
            /^place\s*[:\-]/i,
            /^location\s*[:\-]/i,
            /^venue\s*[:\-]/i
          ]
        },
        {
          key: 'City',
          patterns: [
            /^city\s*[:\-]/i,
            /^town\s*[:\-]/i
          ]
        },
        {
          key: 'District',
          patterns: [
            /^district\s*[:\-]/i
          ]
        },
        {
          key: 'State / Province',
          patterns: [
            /^state\s*[:\-]/i,
            /^province\s*[:\-]/i
          ]
        },
        {
          key: 'Country',
          patterns: [
            /^country\s*[:\-]/i
          ]
        },
        {
          key: 'Address',
          patterns: [
            /^address\s*[:\-]/i,
            /^addr\s*[:\-]/i
          ]
        }
      ]

      for (const rule of locationPatterns) {
        for (const line of lines) {
          const matched =
            rule.patterns.some(
              pattern =>
                pattern.test(line)
            )

          if (!matched) continue

          const value =
            line
              .replace(
                /^[^:\-]+[:\-]\s*/i,
                ''
              )
              .trim()

          if (value) {
            location[
              `${rule.key} detected visually`
            ] = value

            break
          }
        }
      }

      /*
       * Look for lines containing strong location
       * keywords.
       *
       * This catches cases where the image contains:
       *
       * Hyderabad
       * Rangareddy District
       * Telangana
       * India
       *
       * without explicit "City:" labels.
       */
      const locationKeywords = [
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
      
      const keywordLines =
        lines.filter(line => {
          const lower =
            line.toLowerCase()

          return locationKeywords.some(
            keyword =>
              lower.includes(keyword)
          )
        })

      if (keywordLines.length > 0) {
        location[
          'Location-related text detected visually'
        ] = keywordLines.join(' | ')
      }

      /*
       * If the image contains a recognizable coordinate
       * plus surrounding text, retain nearby lines.
       */
      if (coordinateLine) {
        const index =
          lines.indexOf(coordinateLine)

        const nearby =
          lines.slice(
            Math.max(0, index - 2),
            Math.min(
              lines.length,
              index + 3
            )
          )

        if (nearby.length > 0) {
          location[
            'Text surrounding coordinates'
          ] = nearby.join(' | ')
        }
      }

      return location
    } catch (error) {
      console.warn(
        'Visual location detection failed:',
        error
      )

      return {}
    } finally {
      if (
        worker &&
        typeof worker.terminate === 'function'
      ) {
        try {
          await worker.terminate()
        } catch {
          // Ignore worker cleanup errors.
        }
      }
    }
  }

  const getPdfMetadata = async (file) => {
    const arrayBuffer =
      await file.arrayBuffer()

    const pdf =
      await pdfjsLib
        .getDocument({
          data: arrayBuffer
        })
        .promise

    let info = {}

    try {
      const metadataResult =
        await pdf.getMetadata()

      info =
        metadataResult?.info || {}
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

  const getImageMetadata = async (file) => {
    const dimensions =
      await getImageDimensions(file)

    let exif = {}

    try {
      exif =
        await exifr.parse(
          file,
          {
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
        )
    } catch (error) {
      console.warn(
        'Embedded image metadata could not be read:',
        error
      )
    }

    return {
      dimensions,
      exif: exif || {}
    }
  }

  const handleFileSelect = (e) => {
    const file =
      e.target.files?.[0]

    if (!file) return

    setSelectedFile(file)
    setMetadata(null)
    setError('')
  }

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError(
        'Please select a file first.'
      )
      return
    }

    setAnalyzing(true)
    setMetadata(null)
    setError('')

    try {
      const fileName =
        selectedFile.name

      const extension =
        getFileExtension(fileName)

      const baseMetadata = {
        '--- FILE ---': '',

        'File Name':
          fileName,

        'File Extension':
          extension,

        'File Type':
          selectedFile.type ||
          'Unknown',

        'File Size':
          formatBytes(
            selectedFile.size
          ),

        'File Size (bytes)':
          selectedFile.size
            .toLocaleString(),

        'Local File Modified':
          formatDate(
            selectedFile.lastModified
          )
      }

      let additionalMetadata = {}

      /*
       * IMAGE
       */
      if (
        selectedFile.type.startsWith(
          'image/'
        )
      ) {
        const imageData =
          await getImageMetadata(
            selectedFile
          )

        const {
          dimensions,
          exif
        } = imageData

        additionalMetadata = {
          '--- IMAGE ---': '',

          'Image Width':
            `${dimensions.width}px`,

          'Image Height':
            `${dimensions.height}px`,

          'Resolution':
            `${dimensions.width} × ${dimensions.height}px`,

          'Aspect Ratio':
            dimensions.aspectRatio
        }

        /*
         * Camera information
         */
        addIfPresent(
          additionalMetadata,
          'Camera Make',
          exif.Make
        )

        addIfPresent(
          additionalMetadata,
          'Camera Model',
          exif.Model
        )

        addIfPresent(
          additionalMetadata,
          'Lens Make',
          exif.LensMake
        )

        addIfPresent(
          additionalMetadata,
          'Lens Model',
          exif.LensModel
        )

        addIfPresent(
          additionalMetadata,
          'ISO',
          exif.ISO
        )

        addIfPresent(
          additionalMetadata,
          'F-Number',
          exif.FNumber
        )

        addIfPresent(
          additionalMetadata,
          'Exposure Time',
          exif.ExposureTime
        )

        addIfPresent(
          additionalMetadata,
          'Focal Length',
          exif.FocalLength
        )

        addIfPresent(
          additionalMetadata,
          'Orientation',
          exif.Orientation
        )

        addIfPresent(
          additionalMetadata,
          'Software',
          exif.Software
        )

        /*
         * Capture information
         */
        addIfPresent(
          additionalMetadata,
          'Original Capture Date',
          exif.DateTimeOriginal,
          exif.CreateDate,
          exif.DateTimeDigitized
        )

        addIfPresent(
          additionalMetadata,
          'Image Description',
          exif.ImageDescription,
          exif.Description
        )

        addIfPresent(
          additionalMetadata,
          'Artist',
          exif.Artist
        )

        addIfPresent(
          additionalMetadata,
          'Copyright',
          exif.Copyright
        )

        /*
         * LOCATION
         */
        const location =
          extractLocationMetadata(
            exif
          )

        if (
          Object.keys(location).length > 0
        ) {
          additionalMetadata[
            '--- LOCATION / GPS ---'
          ] = ''

          Object.assign(
            additionalMetadata,
            location
          )
        }

        /*
         * VISUAL LOCATION
         *
         * This happens only after embedded
         * metadata has been inspected.
         */
        setMetadata({
          ...baseMetadata,
          ...additionalMetadata
        })

        const visualLocation =
          await extractVisualLocation(
            selectedFile
          )

        if (
          Object.keys(
            visualLocation
          ).length > 0
        ) {
          setMetadata(prev => ({
            ...prev,

            '--- VISUAL LOCATION INFORMATION ---':
              '',

            ...visualLocation
          }))
        }

        /*
         * Explain where location data came from.
         */
        setMetadata(prev => ({
          ...prev,

          '--- LOCATION ANALYSIS ---':
            '',

          'Embedded metadata':
            Object.keys(location).length > 0
              ? 'Location metadata found in the file.'
              : 'No embedded location metadata found.',

          'Visual location information':
            Object.keys(
              visualLocation
            ).length > 0
              ? 'Location-related information detected in the visible image.'
              : 'No additional location-related visual information detected.'
        }))
      }

      /*
       * PDF
       */
      else if (
        selectedFile.type ===
          'application/pdf' ||
        extension === '.pdf'
      ) {
        const pdfData =
          await getPdfMetadata(
            selectedFile
          )

        additionalMetadata = {
          '--- PDF DOCUMENT ---':
            '',

          'Page Count':
            pdfData.pageCount,

          'PDF Version':
            formatValue(
              pdfData.pdfVersion
            ),

          'Title':
            formatValue(
              pdfData.title
            ),

          'Author':
            formatValue(
              pdfData.author
            ),

          'Subject':
            formatValue(
              pdfData.subject
            ),

          'Keywords':
            formatValue(
              pdfData.keywords
            ),

          'Creator':
            formatValue(
              pdfData.creator
            ),

          'Producer':
            formatValue(
              pdfData.producer
            ),

          'PDF Creation Date':
            formatDate(
              pdfData.creationDate
            ),

          'PDF Modification Date':
            formatDate(
              pdfData.modificationDate
            )
        }
      }

      /*
       * OTHER FILES
       */
      else {
        additionalMetadata = {
          '--- FILE ---':
            '',

          'Specialized Metadata':
            'No specialized parser is currently enabled for this file type.'
        }
      }

      setMetadata(prev => ({
        ...(prev || {}),
        ...baseMetadata,
        ...additionalMetadata
      }))
    } catch (error) {
      console.error(
        'Metadata analysis failed:',
        error
      )

      setError(
        error?.message ||
        'Unable to analyze this file.'
      )
    } finally {
      setAnalyzing(false)
    }
  }

  const handleCopyMetadata = async () => {
    if (!metadata) return

    const text =
      Object.entries(metadata)
        .map(
          ([key, value]) =>
            `${key}: ${formatValue(value)}`
        )
        .join('\n')

    try {
      await navigator.clipboard.writeText(
        text
      )

      alert(
        'Metadata copied to clipboard!'
      )
    } catch {
      alert(
        'Failed to copy metadata.'
      )
    }
  }

  const handleDownloadMetadata = () => {
    if (
      !metadata ||
      !selectedFile
    ) {
      return
    }

    const text =
      Object.entries(metadata)
        .map(
          ([key, value]) =>
            `${key}: ${formatValue(value)}`
        )
        .join('\n')

    const blob =
      new Blob(
        [text],
        {
          type:
            'text/plain;charset=utf-8'
        }
      )

    const url =
      URL.createObjectURL(blob)

    const link =
      document.createElement('a')

    link.href = url

    link.download =
      `fileforge-metadata-${selectedFile.name}.txt`

    document.body.appendChild(link)

    link.click()

    link.remove()

    URL.revokeObjectURL(url)
  }

  return (
    <main className="flex-1">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* HEADER */}

        <div className="mb-10">
          <h1 className="text-4xl font-bold text-white mb-4">
            File Metadata Viewer
          </h1>

          <p className="text-slate-300">
            Inspect file metadata, image information,
            camera details, GPS/location data and
            location information visible inside images.
          </p>
        </div>

        {/* PRIVACY */}

        <div className="mb-8 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5">
          <div className="flex gap-3">
            <div className="text-2xl">
              🔒
            </div>

            <div>
              <h3 className="text-white font-semibold mb-1">
                Privacy-first analysis
              </h3>

              <p className="text-slate-400 text-sm">
                FileForge analyzes the selected file
                locally in your browser. Files and
                extracted information are not intentionally
                uploaded to a server.
              </p>
            </div>
          </div>
        </div>

        {/* MAIN GRID */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* SELECT */}

          <div>
            <div className="rounded-3xl border border-slate-700 bg-slate-800/60 p-6">

              <h2 className="text-xl font-semibold text-white mb-4">
                Select File
              </h2>

              <div className="border-2 border-dashed border-slate-600 rounded-2xl p-8 text-center hover:border-cyan-500 transition-colors">

                <input
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="metadata-file-input"
                />

                <label
                  htmlFor="metadata-file-input"
                  className="cursor-pointer block"
                >
                  <div className="text-4xl mb-3">
                    🧾
                  </div>

                  <p className="text-slate-300 text-sm break-all">
                    {selectedFile
                      ? selectedFile.name
                      : 'Click to select a file'}
                  </p>

                  <p className="text-slate-500 text-xs mt-2">
                    Images, PDFs and other files
                  </p>
                </label>
              </div>

              {selectedFile && (
                <div className="mt-4 p-4 bg-slate-700/50 rounded-xl">
                  <p className="text-green-400 text-xs font-semibold">
                    ✓ File selected
                  </p>

                  <p className="text-slate-400 text-xs mt-2">
                    {formatBytes(
                      selectedFile.size
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* INFO */}

          <div>
            <div className="rounded-3xl border border-slate-700 bg-slate-800/60 p-6">

              <h2 className="text-xl font-semibold text-white mb-4">
                File Info
              </h2>

              <div className="space-y-4 text-sm">

                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">
                    Type
                  </span>

                  <span className="text-slate-200 text-right break-all">
                    {selectedFile?.type ||
                      'Not selected'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">
                    Size
                  </span>

                  <span className="text-slate-200">
                    {selectedFile
                      ? formatBytes(
                          selectedFile.size
                        )
                      : '-'}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">
                    Modified
                  </span>

                  <span className="text-slate-200 text-right">
                    {selectedFile
                      ? formatDate(
                          selectedFile.lastModified
                        )
                      : '-'}
                  </span>
                </div>

              </div>
            </div>
          </div>

          {/* ACTION */}

          <div>
            <div className="rounded-3xl border border-slate-700 bg-slate-800/60 p-6">

              <h2 className="text-xl font-semibold text-white mb-4">
                Action
              </h2>

              <button
                onClick={handleAnalyze}
                disabled={
                  !selectedFile ||
                  analyzing
                }
                className="w-full bg-linear-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:scale-100 mb-4"
              >
                {analyzing
                  ? 'Analyzing File...'
                  : 'Analyze Metadata'}
              </button>

              <p className="text-slate-400 text-xs text-center">
                Embedded metadata and location
                information are analyzed locally.
              </p>
            </div>
          </div>
        </div>

        {/* RESULTS */}

        <div className="mt-8 rounded-3xl border border-slate-700 bg-slate-800/60 p-6">

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">

            <h2 className="text-xl font-semibold text-white">
              Metadata Details
            </h2>

            {metadata && (
              <div className="flex gap-2">

                <button
                  onClick={
                    handleCopyMetadata
                  }
                  className="px-4 py-2 bg-linear-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white text-sm font-semibold rounded-lg"
                >
                  📋 Copy
                </button>

                <button
                  onClick={
                    handleDownloadMetadata
                  }
                  className="px-4 py-2 bg-linear-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-sm font-semibold rounded-lg"
                >
                  ⬇️ Download TXT
                </button>

              </div>
            )}
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
              <p className="text-red-400 text-sm">
                ❌ {error}
              </p>
            </div>
          )}

          <div className="bg-slate-900/50 rounded-2xl p-6 max-h-150 overflow-y-auto">

            {metadata ? (

              <div className="space-y-1">

                {Object.entries(
                  metadata
                ).map(
                  ([key, value]) => {

                    const section =
                      key.startsWith('---')

                    return (
                      <div
                        key={key}
                        className={
                          section
                            ? 'pt-5 pb-2'
                            : 'flex flex-col sm:flex-row sm:justify-between gap-2 border-b border-slate-800 py-3'
                        }
                      >

                        {section ? (
                          <span className="text-cyan-400 font-bold text-sm">
                            {key
                              .replaceAll(
                                '-',
                                ''
                              )
                              .trim()}
                          </span>
                        ) : (
                          <>
                            <span className="text-slate-400 font-semibold text-sm">
                              {key}
                            </span>

                            <span className="text-slate-200 text-sm sm:text-right sm:max-w-[65%] break-word">
                              {formatValue(
                                value
                              )}
                            </span>
                          </>
                        )}
                      </div>
                    )
                  }
                )}

              </div>

            ) : (

              <div className="text-slate-400 text-sm">

                <p className="mb-4">
                  Select a file and click
                  "Analyze Metadata".
                </p>

                <ul className="space-y-2 text-xs text-slate-500">

                  <li>
                    • File information
                  </li>

                  <li>
                    • EXIF / XMP / IPTC metadata
                  </li>

                  <li>
                    • Camera and lens information
                  </li>

                  <li>
                    • Original capture information
                  </li>

                  <li>
                    • GPS coordinates
                  </li>

                  <li>
                    • City / locality information
                  </li>

                  <li>
                    • District / state / country information
                  </li>

                  <li>
                    • Location information visibly
                    contained in the image
                  </li>

                  <li>
                    • PDF document metadata
                  </li>

                </ul>
              </div>
            )}
          </div>
        </div>

        {/* EXPLANATION */}

        <div className="mt-8 rounded-3xl border border-amber-500/20 bg-amber-500/5 p-6">

          <h3 className="text-lg font-semibold text-white mb-3">
            📍 How location detection works
          </h3>

          <p className="text-slate-400 text-sm leading-6">
            FileForge first checks the actual metadata
            embedded inside the file, including EXIF,
            GPS, XMP and IPTC information. If the image
            itself visibly contains location-related
            information, FileForge performs a targeted
            local visual analysis to detect useful
            location information without turning this
            tool into a general OCR text extractor.
          </p>

          <p className="text-slate-500 text-xs mt-4 leading-5">
            Visual detection cannot guarantee that every
            place name will be recognized. Text quality,
            font, image resolution, rotation, compression,
            handwriting and image layout can affect
            detection.
          </p>

        </div>

      </div>
    </main>
  )
}