import { useEffect, useRef, useState } from 'react'
import { segmentForeground } from '@imgly/background-removal'
import {
  FaceDetector,
  FilesetResolver,
} from '@mediapipe/tasks-vision'

const PASSPORT_WIDTH = 413
const PASSPORT_HEIGHT = 531
const BLUE_BACKGROUND = '#4A90E2'

/*
 * Vite public assets are normally served from "/" during development
 * and from BASE_URL in production.
 *
 * Because FileForge is deployed under /file-forge/, we test both paths
 * and use whichever one actually serves the local MediaPipe files.
 */
const getCandidateAssetBases = () => {
  const base = import.meta.env.BASE_URL || '/'

  const candidates = [
    base,
    '/',
  ]

  return [...new Set(
    candidates.map((value) => {
      let normalized = value

      if (!normalized.startsWith('/')) {
        normalized = `/${normalized}`
      }

      if (!normalized.endsWith('/')) {
        normalized += '/'
      }

      return normalized
    })
  )]
}

/*
 * Check that a public asset really exists.
 *
 * This is intentionally stricter than checking only HTTP 200 because
 * an SPA fallback can return index.html with a 200 status for a missing
 * asset.
 */
const assetExists = async (url) => {
  try {
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
    })

    if (!response.ok) {
      return false
    }

    const contentType =
      response.headers.get('content-type') || ''

    if (
      contentType.includes('text/html') ||
      contentType.includes('application/xhtml')
    ) {
      return false
    }

    return true
  } catch {
    return false
  }
}

/*
 * Find the actual public base path available in the current environment.
 */
const resolveAssetBase = async () => {
  const candidates = getCandidateAssetBases()

  for (const base of candidates) {
    const wasmTestUrl =
      `${base}mediapipe/vision_wasm_internal.js`

    const modelTestUrl =
      `${base}models/mediapipe/blaze_face_short_range.tflite`

    const [wasmAvailable, modelAvailable] =
      await Promise.all([
        assetExists(wasmTestUrl),
        assetExists(modelTestUrl),
      ])

    if (wasmAvailable && modelAvailable) {
      return base
    }
  }

  throw new Error(
    'Local MediaPipe files could not be found. Make sure the MediaPipe WASM files are inside public/mediapipe and the face model is inside public/models/mediapipe.'
  )
}

const loadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image()

    img.onload = () => resolve(img)

    img.onerror = () => {
      reject(new Error('Unable to load the image.'))
    }

    img.src = src
  })
}

/*
 * Reconstruct the original person pixels using
 * the AI-generated segmentation alpha mask.
 */
const createForegroundFromMask = (
  originalImage,
  maskImage
) => {
  const width = originalImage.width
  const height = originalImage.height

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d', {
    willReadFrequently: true,
  })

  if (!ctx) {
    throw new Error('Could not create foreground canvas.')
  }

  /*
   * Draw the original image first.
   * This preserves the original RGB pixels.
   */
  ctx.drawImage(
    originalImage,
    0,
    0,
    width,
    height
  )

  const originalData = ctx.getImageData(
    0,
    0,
    width,
    height
  )

  /*
   * Draw the AI mask separately.
   */
  const maskCanvas = document.createElement('canvas')
  maskCanvas.width = width
  maskCanvas.height = height

  const maskCtx = maskCanvas.getContext('2d', {
    willReadFrequently: true,
  })

  if (!maskCtx) {
    throw new Error('Could not create mask canvas.')
  }

  maskCtx.drawImage(
    maskImage,
    0,
    0,
    width,
    height
  )

  const maskData = maskCtx.getImageData(
    0,
    0,
    width,
    height
  )

  /*
   * Keep original RGB and replace only alpha.
   *
   * Very faint mask pixels are removed to reduce
   * dirty/gray halos around the person.
   */
  for (let i = 0; i < width * height; i++) {
    const index = i * 4
    const alpha = maskData.data[index + 3]

    if (alpha < 18) {
      originalData.data[index + 3] = 0
    } else {
      originalData.data[index + 3] = alpha
    }
  }

  ctx.putImageData(
    originalData,
    0,
    0
  )

  return canvas
}

/*
 * Find the complete visible person from the
 * segmentation mask.
 *
 * This is used only for safety.
 * It does NOT determine passport subject size.
 */
const getForegroundBounds = (image) => {
  const canvas = document.createElement('canvas')

  canvas.width = image.width
  canvas.height = image.height

  const ctx = canvas.getContext('2d', {
    willReadFrequently: true,
  })

  if (!ctx) {
    throw new Error('Could not analyze foreground image.')
  }

  ctx.drawImage(
    image,
    0,
    0,
    image.width,
    image.height
  )

  const { data } = ctx.getImageData(
    0,
    0,
    canvas.width,
    canvas.height
  )

  const alphaThreshold = 32

  let minX = canvas.width
  let minY = canvas.height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const alpha =
        data[(y * canvas.width + x) * 4 + 3]

      if (alpha >= alphaThreshold) {
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
  }

  if (maxX < 0 || maxY < 0) {
    throw new Error(
      'Could not detect the person in the image.'
    )
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  }
}

/*
 * Pick the largest detected face.
 *
 * If multiple people are present, the largest face
 * is treated as the main passport subject.
 */
const getLargestFace = (detections) => {
  if (!detections?.length) {
    return null
  }

  let largest = null
  let largestArea = 0

  for (const detection of detections) {
    const box = detection?.boundingBox

    if (!box) {
      continue
    }

    const width = Number(box.width)
    const height = Number(box.height)

    if (
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width <= 0 ||
      height <= 0
    ) {
      continue
    }

    const area = width * height

    if (area > largestArea) {
      largestArea = area
      largest = box
    }
  }

  return largest
}

/*
 * Normalize MediaPipe bounding-box coordinates.
 */
const normalizeFaceBox = (
  box,
  imageWidth,
  imageHeight
) => {
  if (!box) {
    return null
  }

  const x = Number(box.originX)
  const y = Number(box.originY)
  const width = Number(box.width)
  const height = Number(box.height)

  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return null
  }

  const left = Math.max(
    0,
    Math.min(imageWidth, x)
  )

  const top = Math.max(
    0,
    Math.min(imageHeight, y)
  )

  const right = Math.max(
    left,
    Math.min(
      imageWidth,
      x + width
    )
  )

  const bottom = Math.max(
    top,
    Math.min(
      imageHeight,
      y + height
    )
  )

  const safeWidth = right - left
  const safeHeight = bottom - top

  if (
    safeWidth <= 0 ||
    safeHeight <= 0
  ) {
    return null
  }

  return {
    x: left,
    y: top,
    width: safeWidth,
    height: safeHeight,
  }
}

/*
 * Scale the complete foreground proportionally.
 *
 * Used only if the requested passport frame is larger
 * than the available source image.
 */
const createScaledCanvas = (
  source,
  scale
) => {
  const width = Math.max(
    1,
    Math.round(source.width * scale)
  )

  const height = Math.max(
    1,
    Math.round(source.height * scale)
  )

  const canvas =
    document.createElement('canvas')

  canvas.width = width
  canvas.height = height

  const ctx =
    canvas.getContext('2d')

  if (!ctx) {
    throw new Error(
      'Could not prepare scaled foreground.'
    )
  }

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  ctx.drawImage(
    source,
    0,
    0,
    width,
    height
  )

  return canvas
}

/*
 * FACE-AWARE PASSPORT FRAMING
 *
 * The face controls subject scale.
 * The body does not.
 *
 * Segmentation is used only to protect
 * hair and person edges.
 */
const getFaceAwareCrop = (
  foreground,
  faceBox,
  humanBounds
) => {
  const passportRatio =
    PASSPORT_WIDTH / PASSPORT_HEIGHT

  /*
   * Face height as a percentage of final passport
   * height.
   *
   * 0.34 gives a reasonably large passport portrait
   * while leaving space for hair and shoulders.
   */
  const targetFaceFraction = 0.34

  /*
   * Target vertical location of face top.
   */
  const targetFaceTopFraction = 0.18

  let source = foreground

  let face = {
    ...faceBox,
  }

  let person = {
    ...humanBounds,
  }

  /*
   * IMPORTANT:
   * Crop size comes from FACE SIZE,
   * not full-body size.
   */
  let cropHeight =
    face.height /
    targetFaceFraction

  let cropWidth =
    cropHeight *
    passportRatio

  /*
   * If the source is too small, scale it.
   */
  if (
    cropWidth > source.width ||
    cropHeight > source.height
  ) {
    const scale = Math.min(
      source.width / cropWidth,
      source.height / cropHeight
    )

    if (
      !Number.isFinite(scale) ||
      scale <= 0
    ) {
      throw new Error(
        'Could not calculate a safe passport crop.'
      )
    }

    source =
      createScaledCanvas(
        source,
        scale
      )

    face = {
      x: face.x * scale,
      y: face.y * scale,
      width: face.width * scale,
      height: face.height * scale,
    }

    person = {
      x: person.x * scale,
      y: person.y * scale,
      width: person.width * scale,
      height: person.height * scale,
    }

    cropHeight *= scale
    cropWidth *= scale
  }

  /*
   * Center horizontally on the face.
   */
  const faceCenterX =
    face.x +
    face.width / 2

  let cropX =
    faceCenterX -
    cropWidth / 2

  /*
   * Put face toward the upper-middle portion.
   */
  let cropY =
    face.y -
    cropHeight *
      targetFaceTopFraction

  /*
   * Keep crop inside image.
   */
  cropX = Math.max(
    0,
    Math.min(
      cropX,
      source.width -
        cropWidth
    )
  )

  cropY = Math.max(
    0,
    Math.min(
      cropY,
      source.height -
        cropHeight
    )
  )

  /*
   * HAIR SAFETY
   *
   * MediaPipe detects the face, but hair can extend
   * above the face box.
   *
   * Move the crop upward instead of enlarging it.
   * This keeps the subject large.
   */
  const topSafety =
    Math.max(
      8,
      face.height * 0.45
    )

  const desiredTop =
    Math.min(
      face.y - topSafety,
      person.y
    )

  if (
    cropY > desiredTop
  ) {
    cropY = desiredTop
  }

  /*
   * Re-clamp after hair protection.
   */
  cropY = Math.max(
    0,
    Math.min(
      cropY,
      source.height -
        cropHeight
    )
  )

  const x =
    Math.round(cropX)

  const y =
    Math.round(cropY)

  const width =
    Math.round(cropWidth)

  const height =
    Math.round(cropHeight)

  if (
    width <= 0 ||
    height <= 0 ||
    x < 0 ||
    y < 0 ||
    x + width > source.width ||
    y + height > source.height
  ) {
    throw new Error(
      'Could not calculate a valid passport frame.'
    )
  }

  return {
    source,
    x,
    y,
    width,
    height,
  }
}

export default function PassportPhotoMaker() {
  const [imageFile, setImageFile] =
    useState(null)

  const [originalPreview, setOriginalPreview] =
    useState(null)

  const [passportPreview, setPassportPreview] =
    useState(null)

  const [processing, setProcessing] =
    useState(false)

  const [progress, setProgress] =
    useState(0)

  const [progressText, setProgressText] =
    useState('')

  const [error, setError] =
    useState('')

  /*
   * MediaPipe detector is created lazily.
   */
  const faceDetectorRef =
    useRef(null)

  const faceDetectorPromiseRef =
    useRef(null)

  const assetBaseRef =
    useRef(null)

  /*
   * Resolve and create the local Face Detector.
   */
  const getFaceDetector =
    async () => {
      if (
        faceDetectorRef.current
      ) {
        return faceDetectorRef.current
      }

      if (
        !faceDetectorPromiseRef.current
      ) {
        faceDetectorPromiseRef.current =
          (async () => {
            /*
             * Find the actual working local public path.
             */
            const assetBase =
              await resolveAssetBase()

            assetBaseRef.current =
              assetBase

            const faceModelPath =
              `${assetBase}models/mediapipe/blaze_face_short_range.tflite`

            const wasmPath =
              `${assetBase}mediapipe`

            /*
             * Create the MediaPipe WASM fileset.
             *
             * MediaPipe expects these files to retain
             * their original filenames.
             */
            const vision =
              await FilesetResolver.forVisionTasks(
                wasmPath
              )

            const detector =
              await FaceDetector.createFromOptions(
                vision,
                {
                  baseOptions: {
                    modelAssetPath:
                      faceModelPath,
                  },

                  runningMode:
                    'IMAGE',

                  minDetectionConfidence:
                    0.5,

                  minSuppressionThreshold:
                    0.3,
                }
              )

            faceDetectorRef.current =
              detector

            return detector
          })().catch(
            (err) => {
              faceDetectorPromiseRef.current =
                null

              throw err
            }
          )
      }

      return faceDetectorPromiseRef.current
    }

  const handleImageSelect =
    (e) => {
      const file =
        e.target.files?.[0]

      if (!file) {
        return
      }

      if (
        !file.type.startsWith('image/')
      ) {
        setError(
          'Please select a valid image file.'
        )

        return
      }

      /*
       * Revoke old preview before replacing it.
       */
      if (originalPreview) {
        URL.revokeObjectURL(
          originalPreview
        )
      }

      if (passportPreview) {
        URL.revokeObjectURL(
          passportPreview
        )
      }

      setImageFile(file)

      setOriginalPreview(
        URL.createObjectURL(file)
      )

      setPassportPreview(null)
      setError('')
      setProgress(0)
      setProgressText('')
    }

  const createPassportPhoto =
    async () => {
      if (!imageFile) {
        setError(
          'Please select an image first.'
        )

        return
      }

      setProcessing(true)
      setError('')
      setPassportPreview(null)
      setProgress(0)
      setProgressText('Starting...')

      try {
        /*
         * STEP 1
         * Load original image.
         */
        setProgress(8)

        setProgressText(
          'Preparing original photo...'
        )

        const originalUrl =
          URL.createObjectURL(
            imageFile
          )

        let originalImage

        try {
          originalImage =
            await loadImage(
              originalUrl
            )
        } finally {
          URL.revokeObjectURL(
            originalUrl
          )
        }

        /*
         * STEP 2
         * LOCAL FACE DETECTION
         */
        setProgress(15)

        setProgressText(
          'Loading local face detector...'
        )

        const faceDetector =
          await getFaceDetector()

        setProgress(28)

        setProgressText(
          'Detecting face and setting framing...'
        )

        const faceResult =
          faceDetector.detect(
            originalImage
          )

        const faceBox =
          getLargestFace(
            faceResult?.detections
          )

        const normalizedFace =
          normalizeFaceBox(
            faceBox,
            originalImage.width,
            originalImage.height
          )

        if (!normalizedFace) {
          throw new Error(
            'Could not detect a clear face. Please use a front-facing photo with the face clearly visible.'
          )
        }

        /*
         * STEP 3
         * Background segmentation.
         *
         * Segmentation does NOT determine
         * passport subject size.
         */
        setProgress(34)

        setProgressText(
          'Loading background-removal AI...'
        )

        const maskBlob =
          await segmentForeground(
            imageFile,
            {
              model: 'isnet',

              output: {
                format: 'image/png',
                quality: 1,
              },

              progress: (
                key,
                current,
                total
              ) => {
                if (!total) {
                  return
                }

                const percentage =
                  Math.round(
                    (current /
                      total) *
                      100
                  )

                if (
                  key.startsWith('fetch:')
                ) {
                  setProgressText(
                    'Loading background-removal AI...'
                  )
                } else if (
                  key ===
                  'compute:decode'
                ) {
                  setProgressText(
                    'Preparing image...'
                  )
                } else if (
                  key ===
                  'compute:inference'
                ) {
                  setProgressText(
                    'Removing original background...'
                  )
                } else if (
                  key ===
                  'compute:mask'
                ) {
                  setProgressText(
                    'Protecting person edges...'
                  )
                }

                setProgress(
                  Math.min(
                    68,
                    34 +
                      Math.round(
                        percentage *
                          0.34
                      )
                  )
                )
              },
            }
          )

        /*
         * STEP 4
         * Reconstruct subject with transparent background.
         */
        setProgress(72)

        setProgressText(
          'Preparing clean subject...'
        )

        const maskUrl =
          URL.createObjectURL(
            maskBlob
          )

        let maskImage

        try {
          maskImage =
            await loadImage(
              maskUrl
            )
        } finally {
          URL.revokeObjectURL(
            maskUrl
          )
        }

        const foregroundCanvas =
          createForegroundFromMask(
            originalImage,
            maskImage
          )

        /*
         * STEP 5
         * Find human bounds for hair/edge safety.
         *
         * Face still controls framing.
         */
        setProgress(78)

        setProgressText(
          'Calculating passport framing...'
        )

        const humanBounds =
          getForegroundBounds(
            foregroundCanvas
          )

        const crop =
          getFaceAwareCrop(
            foregroundCanvas,
            normalizedFace,
            humanBounds
          )

        /*
         * STEP 6
         * Exact 413 × 531 passport canvas.
         */
        setProgress(86)

        setProgressText(
          'Creating clean blue background...'
        )

        const canvas =
          document.createElement(
            'canvas'
          )

        canvas.width =
          PASSPORT_WIDTH

        canvas.height =
          PASSPORT_HEIGHT

        const ctx =
          canvas.getContext(
            '2d',
            {
              alpha: false,
            }
          )

        if (!ctx) {
          throw new Error(
            'Could not create image canvas.'
          )
        }

        ctx.imageSmoothingEnabled =
          true

        ctx.imageSmoothingQuality =
          'high'

        /*
         * Solid uniform passport blue.
         */
        ctx.fillStyle =
          BLUE_BACKGROUND

        ctx.fillRect(
          0,
          0,
          PASSPORT_WIDTH,
          PASSPORT_HEIGHT
        )

        /*
         * Draw face-aware crop.
         */
        ctx.drawImage(
          crop.source,

          crop.x,
          crop.y,

          crop.width,
          crop.height,

          0,
          0,

          PASSPORT_WIDTH,
          PASSPORT_HEIGHT
        )

        /*
         * STEP 7
         * Export high-quality JPEG.
         */
        setProgress(94)

        setProgressText(
          'Finalizing photo...'
        )

        const outputBlob =
          await new Promise(
            (resolve, reject) => {
              canvas.toBlob(
                (blob) => {
                  if (blob) {
                    resolve(blob)
                  } else {
                    reject(
                      new Error(
                        'Failed to create passport photo.'
                      )
                    )
                  }
                },
                'image/jpeg',
                0.95
              )
            }
          )

        /*
         * STEP 8
         * Preview.
         */
        const outputUrl =
          URL.createObjectURL(
            outputBlob
          )

        setPassportPreview(
          outputUrl
        )

        setProgress(100)

        setProgressText(
          'Passport photo ready!'
        )
      } catch (err) {
        console.error(
          'Passport photo generation failed:',
          err
        )

        setError(
          err?.message ||
            'Failed to create passport photo.'
        )

        setProgress(0)
        setProgressText('')
      } finally {
        setProcessing(false)
      }
    }

  const downloadPassportPhoto =
    () => {
      if (!passportPreview) {
        return
      }

      const link =
        document.createElement('a')

      link.href =
        passportPreview

      link.download =
        'fileforge-passport-photo-35x45mm.jpg'

      document.body.appendChild(
        link
      )

      link.click()

      link.remove()
    }

  /*
   * Clean preview URLs when they change.
   */
  useEffect(() => {
    return () => {
      if (originalPreview) {
        URL.revokeObjectURL(
          originalPreview
        )
      }

      if (passportPreview) {
        URL.revokeObjectURL(
          passportPreview
        )
      }
    }
  }, [
    originalPreview,
    passportPreview,
  ])

  /*
   * Close MediaPipe only when the
   * component is actually unmounted.
   */
  useEffect(() => {
    return () => {
      if (
        faceDetectorRef.current
      ) {
        try {
          faceDetectorRef.current.close()
        } catch {
          // Ignore cleanup errors.
        }

        faceDetectorRef.current =
          null
      }

      faceDetectorPromiseRef.current =
        null
    }
  }, [])

  return (
    <main className="flex-1">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Header */}

        <div className="mb-10">
          <h1 className="text-4xl font-bold text-white mb-4">
            Passport Photo Maker
          </h1>

          <p className="text-slate-300">
            Create a professional 35 × 45 mm passport
            photo with a clean blue background.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Upload */}

          <div className="bg-slate-800 rounded-3xl border border-slate-700 p-6 sm:p-8">

            <h2 className="text-xl font-semibold text-white mb-6">
              Upload Photo
            </h2>

            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              disabled={processing}
              className="block w-full text-slate-300 mb-6"
            />

            {originalPreview ? (
              <div className="bg-slate-900 rounded-2xl p-4 flex justify-center">
                <img
                  src={originalPreview}
                  alt="Original"
                  className="max-w-full max-h-[500px] object-contain rounded-xl"
                />
              </div>
            ) : (
              <div className="text-center text-slate-500 py-20">
                No image selected
              </div>
            )}

            <button
              onClick={createPassportPhoto}
              disabled={
                !imageFile ||
                processing
              }
              className="w-full mt-6 px-6 py-3 rounded-xl font-semibold text-white bg-linear-to-r from-blue-500 to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing
                ? 'Creating Photo...'
                : 'Create Passport Photo'}
            </button>

            {/* Progress */}

            {processing && (
              <div className="mt-5">

                <div className="flex justify-between text-xs mb-2">

                  <span className="text-slate-400">
                    {progressText}
                  </span>

                  <span className="text-blue-400 font-semibold">
                    {progress}%
                  </span>

                </div>

                <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{
                      width: `${progress}%`,
                    }}
                  />
                </div>

                <p className="text-center text-xs text-slate-500 mt-3">
                  The first run may take longer while
                  the AI model loads.
                </p>

              </div>
            )}

            {/* Error */}

            {error && (
              <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                <p className="text-red-400 text-sm">
                  ❌ {error}
                </p>
              </div>
            )}

          </div>

          {/* Result */}

          <div className="bg-slate-800 rounded-3xl border border-slate-700 p-6 sm:p-8">

            <h2 className="text-xl font-semibold text-white mb-6">
              Passport Preview
            </h2>

            {passportPreview ? (
              <>

                <div className="bg-slate-900 rounded-2xl p-6 flex justify-center">

                  <img
                    src={passportPreview}
                    alt="Passport photo"
                    className="w-[280px] max-w-full h-auto border-2 border-white shadow-xl"
                  />

                </div>

                <div className="mt-5 rounded-2xl bg-slate-900/70 p-4">

                  <div className="flex justify-between text-sm mb-3">

                    <span className="text-slate-400">
                      Photo size
                    </span>

                    <span className="text-white font-medium">
                      35 × 45 mm
                    </span>

                  </div>

                  <div className="flex justify-between text-sm mb-3">

                    <span className="text-slate-400">
                      Resolution
                    </span>

                    <span className="text-white font-medium">
                      413 × 531 px
                    </span>

                  </div>

                  <div className="flex justify-between text-sm">

                    <span className="text-slate-400">
                      Background
                    </span>

                    <span className="text-white font-medium">
                      Blue
                    </span>

                  </div>

                </div>

                <button
                  onClick={
                    downloadPassportPhoto
                  }
                  className="w-full mt-6 px-6 py-3 rounded-xl font-semibold text-white bg-linear-to-r from-blue-500 to-purple-600 hover:scale-[1.01] transition-transform"
                >
                  Download Passport Photo
                </button>

              </>
            ) : (
              <div className="text-center text-slate-500 py-20">
                Your passport photo will appear here
              </div>
            )}

          </div>

        </div>

        {/* Info */}

        <div className="mt-8 rounded-3xl border border-slate-700 bg-slate-800/50 p-6">

          <h3 className="text-lg font-semibold text-white mb-4">
            How it works
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            <div>
              <p className="text-blue-400 font-semibold">
                01
              </p>

              <p className="text-slate-300 text-sm mt-1">
                Upload your photo
              </p>
            </div>

            <div>
              <p className="text-blue-400 font-semibold">
                02
              </p>

              <p className="text-slate-300 text-sm mt-1">
                Automatically remove background
              </p>
            </div>

            <div>
              <p className="text-blue-400 font-semibold">
                03
              </p>

              <p className="text-slate-300 text-sm mt-1">
                Add blue passport background
              </p>
            </div>

            <div>
              <p className="text-blue-400 font-semibold">
                04
              </p>

              <p className="text-slate-300 text-sm mt-1">
                Download 35 × 45 mm photo
              </p>
            </div>

          </div>

        </div>

      </div>
    </main>
  )
}