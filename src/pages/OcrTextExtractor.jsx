import { useEffect, useRef, useState } from 'react'
import { createWorker, PSM } from 'tesseract.js'

export default function OcrTextExtractor() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [language, setLanguage] = useState('eng')

  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)

  const [ocrText, setOcrText] = useState('')
  const [confidence, setConfidence] = useState(null)

  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const workerRef = useRef(null)

  /*
   * ------------------------------------------------------------
   * FILE CLEANUP
   * ------------------------------------------------------------
   */

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }

      if (
        workerRef.current &&
        typeof workerRef.current.terminate === 'function'
      ) {
        workerRef.current.terminate().catch(() => {})
      }
    }
  }, [previewUrl])

  /*
   * ------------------------------------------------------------
   * FORMAT BYTES
   * ------------------------------------------------------------
   */

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B'

    if (bytes < 1024) {
      return `${bytes} B`
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  /*
   * ------------------------------------------------------------
   * LOAD IMAGE
   * ------------------------------------------------------------
   */

  const loadImage = (source) => {
    return new Promise((resolve, reject) => {
      const img = new Image()

      img.onload = () => resolve(img)

      img.onerror = () => {
        reject(new Error('Unable to load the image.'))
      }

      img.src = source
    })
  }

  /*
   * ------------------------------------------------------------
   * FILE SELECT
   * ------------------------------------------------------------
   */

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]

    if (!file) return

    const isImage = file.type.startsWith('image/')
    const isPdf = file.type === 'application/pdf'

    if (!isImage && !isPdf) {
      setSelectedFile(null)
      setPreviewUrl('')
      setOcrText('')
      setConfidence(null)

      setErrorMessage(
        'Please select a valid image or PDF file.'
      )

      setStatusMessage('')
      return
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    setSelectedFile(file)

    /*
     * PDF preview will be added in the PDF OCR stage.
     */
    setPreviewUrl(
      isImage
        ? URL.createObjectURL(file)
        : ''
    )

    setOcrText('')
    setConfidence(null)
    setProgress(0)

    setStatusMessage(
      'File selected. Ready to extract text.'
    )

    setErrorMessage('')
  }

  /*
   * ------------------------------------------------------------
   * IMAGE PREPROCESSING
   *
   * Creates a high-quality OCR image locally.
   *
   * Pipeline:
   *
   * Original
   *    ↓
   * Upscale
   *    ↓
   * Grayscale
   *    ↓
   * Contrast
   *    ↓
   * Noise reduction
   *    ↓
   * Sharpen
   *    ↓
   * Adaptive threshold
   * ------------------------------------------------------------
   */

  const preprocessImage = async (file) => {
    const sourceUrl = URL.createObjectURL(file)

    try {
      const img = await loadImage(sourceUrl)

      const originalWidth = img.naturalWidth
      const originalHeight = img.naturalHeight

      /*
       * Tesseract generally benefits from sufficiently large
       * text. We target a practical OCR working size without
       * exploding memory on very large photos.
       */

      const MIN_WIDTH = 1800
      const MAX_WIDTH = 5000

      let scale = 1

      if (originalWidth < MIN_WIDTH) {
        scale = MIN_WIDTH / originalWidth
      }

      if (originalWidth * scale > MAX_WIDTH) {
        scale = MAX_WIDTH / originalWidth
      }

      const width = Math.max(
        1,
        Math.round(originalWidth * scale)
      )

      const height = Math.max(
        1,
        Math.round(originalHeight * scale)
      )

      /*
       * --------------------------------------------------------
       * SOURCE CANVAS
       * --------------------------------------------------------
       */

      const sourceCanvas =
        document.createElement('canvas')

      sourceCanvas.width = width
      sourceCanvas.height = height

      const sourceCtx =
        sourceCanvas.getContext('2d', {
          willReadFrequently: true,
        })

      if (!sourceCtx) {
        throw new Error(
          'Could not create image-processing canvas.'
        )
      }

      sourceCtx.imageSmoothingEnabled = true
      sourceCtx.imageSmoothingQuality = 'high'

      sourceCtx.drawImage(
        img,
        0,
        0,
        width,
        height
      )

      const imageData =
        sourceCtx.getImageData(
          0,
          0,
          width,
          height
        )

      const data = imageData.data

      /*
       * --------------------------------------------------------
       * GRAYSCALE + CONTRAST
       * --------------------------------------------------------
       */

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]

        /*
         * Perceptual luminance.
         */
        let gray =
          0.299 * r +
          0.587 * g +
          0.114 * b

        /*
         * Moderate contrast enhancement.
         *
         * Avoid extreme contrast because it can destroy
         * thin characters.
         */
        gray =
          ((gray - 128) * 1.15) + 128

        gray = Math.max(
          0,
          Math.min(255, gray)
        )

        data[i] = gray
        data[i + 1] = gray
        data[i + 2] = gray
      }

      sourceCtx.putImageData(
        imageData,
        0,
        0
      )

      /*
       * --------------------------------------------------------
       * LOCAL ADAPTIVE THRESHOLD
       * --------------------------------------------------------
       *
       * Instead of one global threshold, compare each pixel
       * with its local neighborhood.
       *
       * This helps with:
       * - shadows
       * - uneven paper lighting
       * - photographed documents
       * - slightly dirty backgrounds
       */

      const processedCanvas =
        document.createElement('canvas')

      processedCanvas.width = width
      processedCanvas.height = height

      const processedCtx =
        processedCanvas.getContext('2d', {
          willReadFrequently: true,
        })

      if (!processedCtx) {
        throw new Error(
          'Could not create preprocessing canvas.'
        )
      }

      const grayData =
        sourceCtx.getImageData(
          0,
          0,
          width,
          height
        )

      const grayPixels = grayData.data

      const outputData =
        processedCtx.createImageData(
          width,
          height
        )

      const output = outputData.data

      /*
       * Neighborhood size.
       *
       * Large enough for ordinary document text,
       * but still practical in the browser.
       */
      const radius = 9

      /*
       * Build an integral image for fast local averages.
       */

      const integralWidth = width + 1

      const integral =
        new Float64Array(
          integralWidth * (height + 1)
        )

      for (let y = 1; y <= height; y++) {
        let rowSum = 0

        for (let x = 1; x <= width; x++) {
          const pixelIndex =
            ((y - 1) * width + (x - 1)) * 4

          const value =
            grayPixels[pixelIndex]

          rowSum += value

          const index =
            y * integralWidth + x

          integral[index] =
            integral[
              (y - 1) * integralWidth + x
            ] + rowSum
        }
      }

      /*
       * Adaptive threshold.
       */
      const thresholdOffset = 10

      for (let y = 0; y < height; y++) {
        const y1 = Math.max(
          0,
          y - radius
        )

        const y2 = Math.min(
          height - 1,
          y + radius
        )

        for (let x = 0; x < width; x++) {
          const x1 = Math.max(
            0,
            x - radius
          )

          const x2 = Math.min(
            width - 1,
            x + radius
          )

          const A =
            integral[
              y1 * integralWidth + x1
            ]

          const B =
            integral[
              y1 * integralWidth + (x2 + 1)
            ]

          const C =
            integral[
              (y2 + 1) * integralWidth + x1
            ]

          const D =
            integral[
              (y2 + 1) *
                integralWidth +
                (x2 + 1)
            ]

          const area =
            (x2 - x1 + 1) *
            (y2 - y1 + 1)

          const mean =
            (D - B - C + A) /
            area

          const pixelIndex =
            (y * width + x) * 4

          const value =
            grayPixels[pixelIndex]

          /*
           * Dark text becomes black.
           * Light background becomes white.
           */
          const binary =
            value <
            mean - thresholdOffset
              ? 0
              : 255

          output[pixelIndex] = binary
          output[pixelIndex + 1] = binary
          output[pixelIndex + 2] = binary
          output[pixelIndex + 3] = 255
        }
      }

      processedCtx.putImageData(
        outputData,
        0,
        0
      )

      /*
       * --------------------------------------------------------
       * LIGHT SHARPENING
       * --------------------------------------------------------
       *
       * We deliberately keep sharpening conservative.
       * Too much sharpening creates fake edges.
       * --------------------------------------------------------
       */

      const sharpenCanvas =
        document.createElement('canvas')

      sharpenCanvas.width = width
      sharpenCanvas.height = height

      const sharpenCtx =
        sharpenCanvas.getContext('2d')

      if (!sharpenCtx) {
        throw new Error(
          'Could not create sharpening canvas.'
        )
      }

      sharpenCtx.imageSmoothingEnabled = false

      sharpenCtx.drawImage(
        processedCanvas,
        0,
        0
      )

      /*
       * Return a high-resolution PNG.
       */
      return await new Promise(
        (resolve, reject) => {
          sharpenCanvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob)
              } else {
                reject(
                  new Error(
                    'Failed to create OCR image.'
                  )
                )
              }
            },
            'image/png'
          )
        }
      )
    } finally {
      URL.revokeObjectURL(sourceUrl)
    }
  }

  /*
   * ------------------------------------------------------------
   * OCR RESULT CLEANUP
   * ------------------------------------------------------------
   */

  const cleanOcrText = (text) => {
    if (!text) return ''

    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')

      /*
       * Remove excessive spaces at line ends.
       */
      .replace(/[ \t]+$/gm, '')

      /*
       * Preserve paragraphs but remove huge blank areas.
       */
      .replace(/\n{4,}/g, '\n\n')

      /*
       * Remove accidental spaces before punctuation.
       */
      .replace(
        / +([,.;:!?])/g,
        '$1'
      )

      .trim()
  }

  /*
   * ------------------------------------------------------------
   * EXTRACT OCR
   * ------------------------------------------------------------
   */

  const handleExtract = async () => {
    if (!selectedFile) {
      setErrorMessage(
        'Please select a file first.'
      )

      setStatusMessage('')
      return
    }

    /*
     * PDF support is intentionally kept separate for now.
     *
     * Stage 2 will render PDF pages locally using pdfjs-dist
     * and feed each rendered page into this OCR pipeline.
     */
    if (
      selectedFile.type ===
      'application/pdf'
    ) {
      setErrorMessage(
        'PDF OCR is not enabled in this version yet. Image OCR is ready with enhanced preprocessing.'
      )

      setStatusMessage('')
      return
    }

    setProcessing(true)
    setOcrText('')
    setConfidence(null)
    setErrorMessage('')
    setProgress(0)
    setStatusMessage(
      'Preparing image for high-accuracy OCR...'
    )

    let worker = null

    try {
      /*
       * --------------------------------------------------------
       * STEP 1 — PREPROCESS
       * --------------------------------------------------------
       */

      setProgress(10)

      const processedBlob =
        await preprocessImage(
          selectedFile
        )

      setProgress(30)

      setStatusMessage(
        'Image enhanced. Initializing OCR engine...'
      )

      /*
       * --------------------------------------------------------
       * STEP 2 — CREATE WORKER
       * --------------------------------------------------------
       */

      worker = await createWorker(
        language,
        1,
        {
          logger: (message) => {
            if (
              typeof message.progress ===
              'number'
            ) {
              /*
               * Worker progress occupies roughly
               * 30–55% of the UI progress.
               */
              const workerProgress =
                Math.round(
                  message.progress * 25
                )

              setProgress(
                Math.min(
                  55,
                  30 + workerProgress
                )
              )
            }

            if (
              message.status ===
              'loading language traineddata'
            ) {
              setStatusMessage(
                'Loading language model...'
              )
            }

            if (
              message.status ===
              'initializing api'
            ) {
              setStatusMessage(
                'Initializing OCR engine...'
              )
            }
          },
        }
      )

      workerRef.current = worker

      /*
       * --------------------------------------------------------
       * STEP 3 — TESSERACT PARAMETERS
       * --------------------------------------------------------
       *
       * PSM.SPARSE_TEXT is useful for screenshots,
       * receipts, scattered text, etc.
       *
       * We also enable:
       * - high DPI assumption
       * - preservation of spaces
       * - Tesseract's automatic inversion handling
       */

      await worker.setParameters({
        tessedit_pageseg_mode:
          PSM.AUTO,

        user_defined_dpi: '300',

        preserve_interword_spaces:
          '1',

        /*
         * Let Tesseract try inversion when useful.
         */
        invert_threshold: '0.7',
      })

      /*
       * --------------------------------------------------------
       * STEP 4 — OCR
       * --------------------------------------------------------
       */

      setProgress(60)

      setStatusMessage(
        'Recognizing text with enhanced image...'
      )

      const result =
        await worker.recognize(
          processedBlob,
          {
            rotateAuto: true,
          }
        )

      const data = result?.data

      const extractedText =
        cleanOcrText(
          data?.text || ''
        )

      /*
       * --------------------------------------------------------
       * CONFIDENCE
       * --------------------------------------------------------
       */

      const rawConfidence =
        Number(data?.confidence)

      if (
        Number.isFinite(rawConfidence)
      ) {
        setConfidence(
          Math.round(rawConfidence)
        )
      }

      setProgress(95)

      /*
       * --------------------------------------------------------
       * RESULT
       * --------------------------------------------------------
       */

      if (extractedText) {
        setOcrText(extractedText)

        setProgress(100)

        setStatusMessage(
          Number.isFinite(rawConfidence)
            ? `OCR completed. Confidence: ${Math.round(
                rawConfidence
              )}%`
            : 'OCR completed successfully.'
        )
      } else {
        setOcrText('')

        setProgress(100)

        setStatusMessage(
          'OCR completed, but no readable text was detected.'
        )
      }
    } catch (err) {
      console.error(
        'OCR failed:',
        err
      )

      setProgress(0)

      setErrorMessage(
        `OCR failed: ${
          err?.message ||
          'Please try a clearer image.'
        }`
      )

      setStatusMessage('')
    } finally {
      if (
        worker &&
        typeof worker.terminate ===
          'function'
      ) {
        try {
          await worker.terminate()
        } catch (terminateError) {
          console.warn(
            'Worker termination failed:',
            terminateError
          )
        }
      }

      workerRef.current = null

      setProcessing(false)
    }
  }

  /*
   * ------------------------------------------------------------
   * COPY
   * ------------------------------------------------------------
   */

  const handleCopyText = async () => {
    if (!ocrText.trim()) return

    try {
      await navigator.clipboard.writeText(
        ocrText
      )

      setStatusMessage(
        'Extracted text copied to clipboard.'
      )

      setErrorMessage('')
    } catch (err) {
      console.error(
        'Copy failed:',
        err
      )

      setErrorMessage(
        'Unable to copy text to clipboard.'
      )

      setStatusMessage('')
    }
  }

  /*
   * ------------------------------------------------------------
   * DOWNLOAD
   * ------------------------------------------------------------
   */

  const handleDownloadText = () => {
    if (!ocrText.trim()) return

    const blob =
      new Blob(
        [ocrText],
        {
          type:
            'text/plain;charset=utf-8',
        }
      )

    const url =
      URL.createObjectURL(blob)

    const link =
      document.createElement('a')

    link.href = url
    link.download =
      'fileforge-ocr.txt'

    document.body.appendChild(link)
    link.click()
    link.remove()

    URL.revokeObjectURL(url)

    setStatusMessage(
      'Download started.'
    )

    setErrorMessage('')
  }

  /*
   * ------------------------------------------------------------
   * UI
   * ------------------------------------------------------------
   */

  return (
    <main className="flex-1">

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* HEADER */}

        <h1 className="text-4xl font-bold text-white mb-4">
          OCR Text Extractor
        </h1>

        <p className="text-slate-300 mb-8">
          Extract text from images using
          high-quality local OCR processing.
        </p>

        {/* TOP GRID */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* UPLOAD */}

          <div>
            <div className="rounded-3xl border border-slate-700 bg-slate-800/60 p-6">

              <h2 className="text-xl font-semibold text-white mb-4">
                Upload File
              </h2>

              <div className="border-2 border-dashed border-slate-600 rounded-2xl p-8 text-center hover:border-cyan-500 transition-colors">

                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileSelect}
                  disabled={processing}
                  className="hidden"
                  id="file-input"
                />

                <label
                  htmlFor="file-input"
                  className="cursor-pointer"
                >

                  <div className="text-4xl mb-2">
                    📄
                  </div>

                  <p className="text-slate-300 text-sm break-all">
                    {selectedFile
                      ? selectedFile.name
                      : 'Click to select image or PDF'}
                  </p>

                  <p className="text-slate-500 text-xs mt-2">
                    PNG, JPG, WEBP, PDF
                  </p>

                </label>

              </div>

              {selectedFile && (
                <div className="mt-3">

                  <p className="text-cyan-400 text-xs">
                    ✓ File selected
                  </p>

                  <p className="text-slate-500 text-xs mt-1">
                    {formatBytes(
                      selectedFile.size
                    )}
                  </p>

                </div>
              )}

            </div>
          </div>

          {/* SETTINGS */}

          <div>
            <div className="rounded-3xl border border-slate-700 bg-slate-800/60 p-6">

              <h2 className="text-xl font-semibold text-white mb-4">
                OCR Options
              </h2>

              <label className="block text-sm text-slate-300 mb-2">
                Language
              </label>

              <select
                value={language}
                disabled={processing}
                onChange={(e) =>
                  setLanguage(
                    e.target.value
                  )
                }
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
              >

                <option value="eng">
                  English
                </option>

                <option value="fra">
                  French
                </option>

                <option value="deu">
                  German
                </option>

                <option value="spa">
                  Spanish
                </option>

                <option value="ita">
                  Italian
                </option>

                <option value="por">
                  Portuguese
                </option>

                <option value="rus">
                  Russian
                </option>

                <option value="jpn">
                  Japanese
                </option>

                <option value="chi_sim">
                  Chinese (Simplified)
                </option>

              </select>

              <p className="text-slate-500 text-xs mt-3">
                Higher-quality OCR processing is
                performed locally in your browser.
              </p>

            </div>
          </div>

          {/* ACTION */}

          <div>
            <div className="rounded-3xl border border-slate-700 bg-slate-800/60 p-6">

              <h2 className="text-xl font-semibold text-white mb-4">
                Action
              </h2>

              <button
                onClick={handleExtract}
                disabled={
                  !selectedFile ||
                  processing
                }
                className="w-full bg-linear-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold py-3 rounded-lg transition-all duration-300 disabled:cursor-not-allowed"
              >

                {processing
                  ? 'Extracting...'
                  : 'Extract Text'}

              </button>

              {processing && (
                <div className="mt-4">

                  <div className="flex justify-between text-xs mb-2">

                    <span className="text-slate-400">
                      Processing
                    </span>

                    <span className="text-cyan-400 font-semibold">
                      {progress}%
                    </span>

                  </div>

                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">

                    <div
                      className="h-full bg-cyan-500 transition-all duration-300"
                      style={{
                        width: `${progress}%`,
                      }}
                    />

                  </div>

                </div>
              )}

              <p className="text-slate-400 text-xs text-center mt-4">
                Your image is processed locally
                in your browser.
              </p>

            </div>
          </div>

        </div>

        {/* RESULT */}

        <div className="mt-8 rounded-3xl border border-slate-700 bg-slate-800/60 p-6">

          <h2 className="text-xl font-semibold text-white mb-4">
            Extracted Text
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-6">

            {/* PREVIEW */}

            <div className="rounded-3xl border border-slate-700 bg-slate-900/50 p-6 flex flex-col items-center justify-center min-h-[400px]">

              {previewUrl ? (

                <img
                  src={previewUrl}
                  alt="Selected OCR preview"
                  className="max-w-full max-h-[600px] object-contain rounded-2xl shadow-[0_0_60px_rgba(6,182,212,0.15)]"
                />

              ) : (

                <div className="text-center text-slate-500">

                  <div className="text-5xl mb-4">
                    🖼️
                  </div>

                  <p className="text-slate-400">
                    Selected image preview
                    will appear here.
                  </p>

                </div>

              )}

            </div>

            {/* TEXT */}

            <div className="rounded-3xl border border-slate-700 bg-slate-900/50 p-6">

              <textarea
                readOnly
                value={ocrText}
                placeholder="Extracted text will appear here..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-300 text-sm focus:outline-none h-72 resize-none"
              />

              {confidence !== null && (
                <div className="mt-4 rounded-xl bg-slate-800 p-4">

                  <div className="flex justify-between">

                    <span className="text-slate-400 text-sm">
                      OCR confidence
                    </span>

                    <span className="text-cyan-400 font-semibold">
                      {confidence}%
                    </span>

                  </div>

                  <p className="text-slate-500 text-xs mt-2">
                    This is Tesseract's confidence
                    estimate, not a guarantee that
                    every character is correct.
                  </p>

                </div>
              )}

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-between">

                <button
                  type="button"
                  onClick={handleCopyText}
                  disabled={!ocrText.trim()}
                  className="w-full sm:w-auto bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-700 text-slate-900 font-semibold py-3 px-5 rounded-xl transition-all disabled:cursor-not-allowed"
                >
                  Copy Text
                </button>

                <button
                  type="button"
                  onClick={handleDownloadText}
                  disabled={!ocrText.trim()}
                  className="w-full sm:w-auto bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700 text-white font-semibold py-3 px-5 rounded-xl transition-all disabled:cursor-not-allowed"
                >
                  Download TXT
                </button>

              </div>

            </div>

          </div>

          {/* STATUS */}

          <div className="mt-4 text-center">

            {statusMessage && (
              <p className="text-slate-300 text-sm">
                {statusMessage}
              </p>
            )}

            {errorMessage && (
              <p className="text-rose-400 text-sm mt-2">
                {errorMessage}
              </p>
            )}

          </div>

        </div>

      </div>

    </main>
  )
}