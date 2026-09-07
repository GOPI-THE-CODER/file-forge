import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  BarcodeFormat,
  BrowserMultiFormatReader,
} 
from '@zxing/browser'
import { DecodeHintType } from '@zxing/library'

const HISTORY_KEY = 'fileforge-qr-barcode-history'
const MAX_HISTORY = 25

const FORMAT_NAMES = {
  [BarcodeFormat.QR_CODE]: 'QR Code',
  [BarcodeFormat.AZTEC]: 'Aztec',
  [BarcodeFormat.CODABAR]: 'Codabar',
  [BarcodeFormat.CODE_39]: 'Code 39',
  [BarcodeFormat.CODE_93]: 'Code 93',
  [BarcodeFormat.CODE_128]: 'Code 128',
  [BarcodeFormat.DATA_MATRIX]: 'Data Matrix',
  [BarcodeFormat.EAN_8]: 'EAN-8',
  [BarcodeFormat.EAN_13]: 'EAN-13',
  [BarcodeFormat.ITF]: 'ITF',
  [BarcodeFormat.MAXICODE]: 'MaxiCode',
  [BarcodeFormat.PDF_417]: 'PDF417',
  [BarcodeFormat.RSS_14]: 'RSS-14',
  [BarcodeFormat.RSS_EXPANDED]: 'RSS Expanded',
  [BarcodeFormat.UPC_A]: 'UPC-A',
  [BarcodeFormat.UPC_E]: 'UPC-E',
}

const getFormatName = (format) =>
  FORMAT_NAMES[format] || 'Barcode'

const isHttpUrl = (value) => {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

const readHistory = () => {
  try {
    const stored = localStorage.getItem(HISTORY_KEY)

    if (!stored) {
      return []
    }

    const parsed = JSON.parse(stored)

    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const saveHistory = (items) => {
  try {
    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(items)
    )
  } catch {
    // Local history is optional.
  }
}

const formatDate = (timestamp) => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(timestamp))
  } catch {
    return ''
  }
}

const getCameraErrorMessage = (error) => {
  const name = error?.name || ''
  const message = error?.message || ''

  if (
    name === 'NotAllowedError' ||
    name === 'PermissionDeniedError'
  ) {
    return 'Camera permission was denied. Allow camera access in your browser and try again.'
  }

  if (
    name === 'NotFoundError' ||
    name === 'DevicesNotFoundError'
  ) {
    return 'No camera was found on this device.'
  }

  if (
    name === 'NotReadableError' ||
    name === 'TrackStartError'
  ) {
    return 'The camera is already being used by another application.'
  }

  if (name === 'SecurityError') {
    return 'Camera access is blocked by the browser security settings.'
  }
    return message || 'Unable to start the camera.'
}

const loadImageFromUrl = (url) => {
  return new Promise((resolve, reject) => {
    const image = new Image()

    image.onload = () => resolve(image)

    image.onerror = () => {
      reject(
        new Error(
          'Unable to load the selected image.'
        )
      )
    }

    image.src = url
  })
}

const clamp = (value, min, max) =>
  Math.min(Math.max(value, min), max)

const getScaledDimensions = (
  width,
  height,
  maxDimension = 2800
) => {
  const largest =
    Math.max(width, height)

  const scale =
    largest > maxDimension
      ? maxDimension / largest
      : 1

  return {
    width: Math.max(
      1,
      Math.round(width * scale)
    ),
    height: Math.max(
      1,
      Math.round(height * scale)
    ),
  }
}

const drawRotatedImage = (
  image,
  rotation,
  width,
  height
) => {
  const sideways =
    rotation === 90 ||
    rotation === 270

  const canvas =
    document.createElement('canvas')

  canvas.width = sideways
    ? height
    : width

  canvas.height = sideways
    ? width
    : height

  const context =
    canvas.getContext('2d', {
      willReadFrequently: true,
    })

  if (!context) {
    return null
  }

  context.translate(
    canvas.width / 2,
    canvas.height / 2
  )

  context.rotate(
    (rotation * Math.PI) / 180
  )

  context.drawImage(
    image,
    -width / 2,
    -height / 2,
    width,
    height
  )

  context.restore?.()

  return canvas
}

const createProcessedCanvas = (
  sourceCanvas,
  mode
) => {
  const canvas =
    document.createElement('canvas')

  canvas.width =
    sourceCanvas.width

  canvas.height =
    sourceCanvas.height

  const context =
    canvas.getContext('2d', {
      willReadFrequently: true,
    })

  if (!context) {
    return null
  }

  context.drawImage(
    sourceCanvas,
    0,
    0
  )

  if (mode === 'original') {
    return canvas
  }

  const imageData =
    context.getImageData(
      0,
      0,
      canvas.width,
      canvas.height
    )

  const data =
    imageData.data

  let contrast = 1
  let brightness = 0
  let threshold = null

  if (mode === 'contrast') {
    contrast = 1.45
  }

  if (mode === 'strong-contrast') {
    contrast = 1.85
  }

  if (mode === 'bright') {
    brightness = 15
    contrast = 1.25
  }

  if (mode === 'threshold') {
    contrast = 1.5
    threshold = 145
  }

  if (mode === 'threshold-dark') {
    contrast = 1.7
    threshold = 105
  }

  for (
    let index = 0;
    index < data.length;
    index += 4
  ) {
    const red = data[index]
    const green = data[index + 1]
    const blue = data[index + 2]

    let gray =
      0.299 * red +
      0.587 * green +
      0.114 * blue

    gray =
      (gray - 128) *
        contrast +
      128 +
      brightness

    gray = clamp(
      gray,
      0,
      255
    )

    if (threshold !== null) {
      gray =
        gray >= threshold
          ? 255
          : 0
    }

    data[index] = gray
    data[index + 1] = gray
    data[index + 2] = gray
  }

  context.putImageData(
    imageData,
    0,
    0
  )

  return canvas
}

const cropCanvas = (
  sourceCanvas,
  x,
  y,
  width,
  height,
  scale = 1
) => {
  const canvas =
    document.createElement('canvas')

  canvas.width =
    Math.max(
      1,
      Math.round(width * scale)
    )

  canvas.height =
    Math.max(
      1,
      Math.round(height * scale)
    )

  const context =
    canvas.getContext('2d', {
      willReadFrequently: true,
    })

  if (!context) {
    return null
  }

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'

  context.drawImage(
    sourceCanvas,
    x,
    y,
    width,
    height,
    0,
    0,
    canvas.width,
    canvas.height
  )

  return canvas
}

const createScanCandidates = (
  sourceCanvas
) => {
  const candidates = []

  const addCandidate = (
    canvas,
    label
  ) => {
    if (
      canvas &&
      canvas.width > 0 &&
      canvas.height > 0
    ) {
      candidates.push({
        canvas,
        label,
      })
    }
  }

  /*
   * Full image with a small border removed.
   */
  const marginX =
    sourceCanvas.width * 0.06

  const marginY =
    sourceCanvas.height * 0.06

  addCandidate(
    cropCanvas(
      sourceCanvas,
      marginX,
      marginY,
      sourceCanvas.width -
        marginX * 2,
      sourceCanvas.height -
        marginY * 2,
      1.2
    ),
    'center'
  )

  /*
   * Nine overlapping regions.
   *
   * This is important when a code is small
   * inside a large photograph.
   */
  const tileWidth =
    sourceCanvas.width * 0.52

  const tileHeight =
    sourceCanvas.height * 0.52

  const xPositions = [
    0,
    (sourceCanvas.width -
      tileWidth) /
      2,
    sourceCanvas.width -
      tileWidth,
  ]

  const yPositions = [
    0,
    (sourceCanvas.height -
      tileHeight) /
      2,
    sourceCanvas.height -
      tileHeight,
  ]

  for (
    const y of yPositions
  ) {
    for (
      const x of xPositions
    ) {
      addCandidate(
        cropCanvas(
          sourceCanvas,
          clamp(
            x,
            0,
            sourceCanvas.width -
              tileWidth
          ),
          clamp(
            y,
            0,
            sourceCanvas.height -
              tileHeight
          ),
          tileWidth,
          tileHeight,
          1.8
        ),
        'tile'
      )
    }
  }

  /*
   * Horizontal region.
   *
   * Very useful for normal 1D barcodes.
   */
  const horizontalHeight =
    sourceCanvas.height * 0.45

  addCandidate(
    cropCanvas(
      sourceCanvas,
      0,
      (sourceCanvas.height -
        horizontalHeight) /
        2,
      sourceCanvas.width,
      horizontalHeight,
      1.6
    ),
    'horizontal'
  )

  /*
   * Vertical region.
   *
   * Useful for sideways barcodes.
   */
  const verticalWidth =
    sourceCanvas.width * 0.45

  addCandidate(
    cropCanvas(
      sourceCanvas,
      (sourceCanvas.width -
        verticalWidth) /
        2,
      0,
      verticalWidth,
      sourceCanvas.height,
      1.6
    ),
    'vertical'
  )

  return candidates
}

const tryDecodeCanvas = (
  reader,
  canvas
) => {
  try {
    return reader.decodeFromCanvas(
      canvas
    )
  } catch {
    return null
  }
}

const tryDecodeVariants = (
  reader,
  canvas,
  includeThresholds = true
) => {
  const modes = includeThresholds
    ? [
        'original',
        'contrast',
        'strong-contrast',
        'bright',
        'threshold',
        'threshold-dark',
      ]
    : [
        'original',
        'contrast',
        'strong-contrast',
      ]

  for (
    const mode of modes
  ) {
    const processed =
      mode === 'original'
        ? canvas
        : createProcessedCanvas(
            canvas,
            mode
          )

    if (!processed) {
      continue
    }

    const result =
      tryDecodeCanvas(
        reader,
        processed
      )

    if (result) {
      return result
    }
  }

  return null
}

export default function QrBarcodeScanner() {

  const videoRef = useRef(null)
  const readerRef = useRef(null)
  const controlsRef = useRef(null)
  const imageUrlRef = useRef(null)
  const scanLockRef = useRef(false)

  const [mode, setMode] = useState('camera')
  const [cameraRunning, setCameraRunning] = useState(false)
  const [cameras, setCameras] = useState([])
  const [selectedCamera, setSelectedCamera] = useState('')
  const [torchAvailable, setTorchAvailable] = useState(false)
  const [torchOn, setTorchOn] = useState(false)

  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState(
    'Point your camera at a QR code or barcode.'
  )

  const [imageScanning, setImageScanning] = useState(false)
  const [history, setHistory] = useState(readHistory)

  const hasResult = Boolean(result)

  const resultIsUrl = useMemo(
    () => Boolean(result && isHttpUrl(result.text)),
    [result]
  )

  const stopCamera = useCallback(() => {
    scanLockRef.current = true

    try {
      controlsRef.current?.stop()
    } catch {
      // Camera cleanup should never break the page.
    }

    controlsRef.current = null

    const video = videoRef.current

    if (video?.srcObject instanceof MediaStream) {
      video.srcObject
        .getTracks()
        .forEach((track) => track.stop())
video.srcObject = null
    }

    setCameraRunning(false)
    setTorchAvailable(false)
    setTorchOn(false)
  }, [])

  const getReader = useCallback(() => {
  if (!readerRef.current) {
    const hints = new Map()

    hints.set(
      DecodeHintType.TRY_HARDER,
      true
    )

    hints.set(
      DecodeHintType.POSSIBLE_FORMATS,
      [
        BarcodeFormat.QR_CODE,
        BarcodeFormat.DATA_MATRIX,
        BarcodeFormat.AZTEC,
        BarcodeFormat.PDF_417,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.CODE_93,
        BarcodeFormat.EAN_8,
        BarcodeFormat.EAN_13,
        BarcodeFormat.ITF,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.CODABAR,
        BarcodeFormat.RSS_14,
        BarcodeFormat.RSS_EXPANDED,
      ]
    )

    readerRef.current =
      new BrowserMultiFormatReader(hints)
  }

  return readerRef.current
}, [])

  const addToHistory = useCallback((scan) => {
    setHistory((current) => {
      const next = [
        scan,
        ...current.filter(
          (item) =>
            !(
              item.text === scan.text &&
              item.format === scan.format
            )
        ),
      ].slice(0, MAX_HISTORY)

      saveHistory(next)

      return next
    })
  }, [])

  const handleDetectedResult = useCallback(
    (decodedResult) => {
      if (!decodedResult) {
        return
      }

      const text = decodedResult.getText?.() || ''

      if (!text) {
        return
      }

      const formatValue =
        decodedResult.getBarcodeFormat?.()

      const format =
        getFormatName(formatValue)

      const scan = {
        id: `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`,
        text,
        format,
        timestamp: Date.now(),
      }

      setResult(scan)
      setError('')
      setStatus('Code detected successfully.')
      addToHistory(scan)

      stopCamera()
    },
    [addToHistory, stopCamera]
  )

  const startCamera = useCallback(
    async (cameraId = '') => {
      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setError(
          'Camera scanning is not supported by this browser.'
        )
        return
      }

      stopCamera()

      setError('')
      setResult(null)
      setTorchAvailable(false)
      setTorchOn(false)
      setStatus('Starting camera...')
      scanLockRef.current = false

      try {
        const reader = getReader()

        const constraints = cameraId
          ? {
              video: {
                deviceId: {
                  exact: cameraId,
                },
                width: {
                  ideal: 1920,
                },
                height: {
                  ideal: 1080,
                },
              },
            }
          : {
              video: {
                facingMode: {
                  ideal: 'environment',
                },
                width: {
                  ideal: 1920,
                },
                height: {
                  ideal: 1080,
                },
              },
            }

        const controls =
          await reader.decodeFromConstraints(
            constraints,
            videoRef.current,
            (decoded, decodeError) => {
              if (
                scanLockRef.current ||
                !decoded
              ) {
                return
              }

              scanLockRef.current = true

              handleDetectedResult(decoded)

              if (decodeError) {
                return
              }
            }
          )

        controlsRef.current = controls

        setCameraRunning(true)
        setStatus(
          'Scanning… point the camera at a code.'
        )

        if (controls.switchTorch) {
          setTorchAvailable(true)
        }

        try {
          const devices =
            await reader.listVideoInputDevices()

          setCameras(devices)

          if (cameraId) {
            setSelectedCamera(cameraId)
          } else if (devices.length > 0) {
            const currentVideoTrack =
              videoRef.current?.srcObject
                ?.getVideoTracks?.()[0]

            const currentDeviceId =
              currentVideoTrack
                ?.getSettings?.()
                ?.deviceId

            const environmentDevice =
              devices.find(
                (device) =>
                  device.deviceId ===
                  currentDeviceId
              )

            setSelectedCamera(
              environmentDevice?.deviceId ||
                devices[0].deviceId
            )
          }
        } catch {
          // Device enumeration is optional.
        }
      } catch (cameraError) {
        stopCamera()
        setError(
          getCameraErrorMessage(cameraError)
        )
        setStatus(
          'Camera could not be started.'
        )
      }
    },
    [
      getReader,
      handleDetectedResult,
      stopCamera,
    ]
  )

  const toggleTorch = async () => {
    const controls = controlsRef.current

    if (
      !controls?.switchTorch ||
      !torchAvailable
    ) {
      return
    }

    try {
      const nextState = !torchOn

      await controls.switchTorch(nextState)

      setTorchOn(nextState)
    } catch {
      setError(
        'The camera torch could not be controlled on this device.'
      )
    }
  }

    const scanImage = async (file) => {
    if (!file) {
      return
    }

    if (!file.type.startsWith('image/')) {
      setError(
        'Please choose an image file.'
      )
      return
    }

    stopCamera()

    setImageScanning(true)
    setError('')
    setResult(null)
    setStatus(
      'Preparing image for scanning…'
    )

    if (imageUrlRef.current) {
      URL.revokeObjectURL(
        imageUrlRef.current
      )

      imageUrlRef.current = null
    }

    const imageUrl =
      URL.createObjectURL(file)

    imageUrlRef.current =
      imageUrl

    try {
      const reader =
        getReader()

      const image =
        await loadImageFromUrl(
          imageUrl
        )

      const {
        width,
        height,
      } = getScaledDimensions(
        image.naturalWidth,
        image.naturalHeight,
        2800
      )

      /*
       * Create one controlled-size master
       * canvas so extremely large phone
       * photographs do not consume excessive
       * browser memory.
       */
      const masterCanvas =
        document.createElement(
          'canvas'
        )

      masterCanvas.width =
        width

      masterCanvas.height =
        height

      const masterContext =
        masterCanvas.getContext(
          '2d',
          {
            willReadFrequently: true,
          }
        )

      if (!masterContext) {
        throw new Error(
          'Could not create image canvas.'
        )
      }

      masterContext.imageSmoothingEnabled =
        true

      masterContext.imageSmoothingQuality =
        'high'

      masterContext.drawImage(
        image,
        0,
        0,
        width,
        height
      )

      /*
       * First try the original orientation.
       *
       * Full image gets the complete set
       * of processing variants.
       */
      setStatus(
        'Scanning original image…'
      )

      let decoded =
        tryDecodeVariants(
          reader,
          masterCanvas,
          true
        )

      if (decoded) {
        handleDetectedResult(
          decoded
        )

        return
      }

      /*
       * Now search smaller regions.
       *
       * This is what helps when a QR/barcode
       * occupies only a small part of a photo.
       */
      const rotations = [
        0,
        90,
        180,
        270,
      ]

      for (
        const rotation
        of rotations
      ) {
        let rotatedCanvas

        if (rotation === 0) {
          rotatedCanvas =
            masterCanvas
        } else {
          rotatedCanvas =
            drawRotatedImage(
              image,
              rotation,
              width,
              height
            )
        }

        if (!rotatedCanvas) {
          continue
        }

        setStatus(
          rotation === 0
            ? 'Searching difficult regions…'
            : `Trying ${rotation}° orientation…`
        )

        /*
         * First try the full rotated image.
         */
        decoded =
          tryDecodeVariants(
            reader,
            rotatedCanvas,
            true
          )

        if (decoded) {
          handleDetectedResult(
            decoded
          )

          return
        }

        /*
         * Then try intelligently enlarged
         * regions of the photograph.
         */
        const candidates =
          createScanCandidates(
            rotatedCanvas
          )

        for (
          const candidate
          of candidates
        ) {
          setStatus(
            'Enhancing barcode region…'
          )

          /*
           * Cropped regions only need the
           * lighter variants first.
           */
          decoded =
            tryDecodeVariants(
              reader,
              candidate.canvas,
              false
            )

          if (decoded) {
            handleDetectedResult(
              decoded
            )

            return
          }

          /*
           * Thresholding is more expensive,
           * so only use it after the normal
           * variants fail.
           */
          decoded =
            tryDecodeVariants(
              reader,
              candidate.canvas,
              true
            )

          if (decoded) {
            handleDetectedResult(
              decoded
            )

            return
          }
        }
      }

      throw new Error(
        'No supported QR code or barcode was found.'
      )
    } catch (imageError) {
      console.error(
        'Image barcode scan failed:',
        imageError
      )

      setError(
        'No QR code or supported barcode was found in this image.'
      )

      setStatus(
        'Try a clearer image with the code fully visible.'
      )
    } finally {
      setImageScanning(false)

      URL.revokeObjectURL(
        imageUrl
      )

      if (
        imageUrlRef.current ===
        imageUrl
      ) {
        imageUrlRef.current =
          null
      }
    }
  }

  const handleImageChange = (event) => {
    const file =
      event.target.files?.[0]

    event.target.value = ''

    scanImage(file)
  }

  const copyResult = async () => {
    if (!result?.text) {
      return
    }

    try {
      await navigator.clipboard.writeText(
        result.text
      )

      setStatus('Result copied to clipboard.')
    } catch {
      setError(
        'Clipboard access was blocked by the browser.'
      )
    }
  }

  const clearHistory = () => {
    setHistory([])
    saveHistory([])
  }

  const removeHistoryItem = (id) => {
    setHistory((current) => {
      const next = current.filter(
        (item) => item.id !== id
      )

      saveHistory(next)

      return next
    })
  }

  const selectHistoryItem = (item) => {
    setResult(item)
    setError('')
    setStatus('Previous scan selected.')
  }

  useEffect(() => {
    if (mode === 'camera') {
      setStatus(
        'Point your camera at a QR code or barcode.'
      )
    } else {
      stopCamera()
      setStatus(
        'Choose an image containing a QR code or barcode.'
      )
    }
  }, [mode, stopCamera])

  useEffect(() => {
    return () => {
      stopCamera()

      if (imageUrlRef.current) {
        URL.revokeObjectURL(
          imageUrlRef.current
        )
      }

      try {
        readerRef.current?.reset()
      } catch {
        // Ignore scanner cleanup errors.
      }
    }
  }, [stopCamera])

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 text-center">
          <div className="mb-3 text-4xl">
            📷
          </div>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            QR & Barcode Scanner
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
            Scan QR codes and barcodes directly in
            your browser. Everything is processed
            locally on your device.
          </p>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
            <span>🔒</span>
            100% local processing
          </div>
        </header>

        <div className="mb-6 flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-2 sm:flex-row">
          <button
            type="button"
            onClick={() => setMode('camera')}
            className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition ${
              mode === 'camera'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            📷 Camera Scanner
          </button>

          <button
            type="button"
            onClick={() => setMode('image')}
            className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition ${
              mode === 'image'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            🖼️ Scan Image
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-xl">
            {mode === 'camera' ? (
              <>
                <div className="relative aspect-video bg-black">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="h-full w-full object-cover"
                  />

                  {!cameraRunning && (
                    <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
                      <div>
                        <div className="mb-3 text-5xl">
                          📷
                        </div>

                        <p className="text-sm text-slate-400">
                          Camera preview will
                          appear here.
                        </p>
                      </div>
                    </div>
                  )}

                  {cameraRunning && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="relative h-56 w-56 max-w-[70%] rounded-3xl border-2 border-white/80">
                        <span className="absolute -left-1 -top-1 h-8 w-8 rounded-tl-2xl border-l-4 border-t-4 border-blue-400" />
                        <span className="absolute -right-1 -top-1 h-8 w-8 rounded-tr-2xl border-r-4 border-t-4 border-blue-400" />
                        <span className="absolute -bottom-1 -left-1 h-8 w-8 rounded-bl-2xl border-b-4 border-l-4 border-blue-400" />
                        <span className="absolute -bottom-1 -right-1 h-8 w-8 rounded-br-2xl border-b-4 border-r-4 border-blue-400" />

                        <div className="absolute left-4 right-4 top-1/2 h-px bg-blue-400/80" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3 p-4">
                  {cameras.length > 1 && (
                    <select
                      value={selectedCamera}
                      onChange={(event) => {
                        const id =
                          event.target.value

                        setSelectedCamera(id)
                        startCamera(id)
                      }}
                      disabled={!cameraRunning}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500 disabled:opacity-50"
                    >
                      {cameras.map((camera, index) => (
                        <option
                          key={
                            camera.deviceId ||
                            index
                          }
                          value={camera.deviceId}
                        >
                          {camera.label ||
                            `Camera ${index + 1}`}
                        </option>
                      ))}
                    </select>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {!cameraRunning ? (
                      <button
                        type="button"
                        onClick={() =>
                          startCamera()
                        }
                        className="flex-1 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500"
                      >
                        Start Camera
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 font-semibold text-white transition hover:bg-slate-700"
                      >
                        Stop Camera
                      </button>
                    )}

                    {cameraRunning &&
                      torchAvailable && (
                        <button
                          type="button"
                          onClick={toggleTorch}
                          className={`rounded-xl px-5 py-3 font-semibold transition ${
                            torchOn
                              ? 'bg-amber-500 text-black'
                              : 'border border-slate-700 bg-slate-800 text-white hover:bg-slate-700'
                          }`}
                        >
                          {torchOn
                            ? '🔦 Torch On'
                            : '🔦 Torch'}
                        </button>
                      )}
                  </div>
                </div>
              </>
            ) : (
              <div className="p-6 sm:p-8">
                <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950/70 px-6 text-center">
                  <div className="mb-4 text-5xl">
                    🖼️
                  </div>

                  <h2 className="text-xl font-semibold">
                    Scan a QR code or barcode image
                  </h2>

                  <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
                    Select an image from your
                    device. The image is decoded
                    locally and is not uploaded.
                  </p>

                  <label className="mt-6 cursor-pointer rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-500">
                    {imageScanning
                      ? 'Reading Image…'
                      : 'Choose Image'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={
                        handleImageChange
                      }
                      disabled={imageScanning}
                    />
                  </label>
                </div>
              </div>
            )}

            <div className="border-t border-slate-800 px-5 py-4">
              <p className="text-sm text-slate-400">
                {status}
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Scan Result
                </p>

                <h2 className="mt-1 text-xl font-bold">
                  {hasResult
                    ? result.format
                    : 'Waiting for a code'}
                </h2>
              </div>

              {hasResult && (
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                  Detected
                </span>
              )}
            </div>

            {result ? (
              <>
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="break-words text-sm leading-6 text-slate-200">
                    {result.text}
                  </p>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  <button
                    type="button"
                    onClick={copyResult}
                    className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
                  >
                    📋 Copy Result
                  </button>

                  {resultIsUrl && (
                    <a
                      href={result.text}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-700"
                    >
                      🌐 Open Link
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setResult(null)
                      setError('')
                      setStatus(
                        mode === 'camera'
                          ? 'Point your camera at a code.'
                          : 'Choose another image to scan.'
                      )
                    }}
                    className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                  >
                    🔄 Scan Again
                  </button>
                </div>

                <div className="mt-5 rounded-xl bg-slate-950/70 p-4">
                  <div className="flex justify-between gap-4 text-xs">
                    <span className="text-slate-500">
                      Format
                    </span>
                    <span className="text-slate-300">
                      {result.format}
                    </span>
                  </div>

                  <div className="mt-2 flex justify-between gap-4 text-xs">
                    <span className="text-slate-500">
                      Scanned
                    </span>
                    <span className="text-right text-slate-300">
                      {formatDate(
                        result.timestamp
                      )}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex min-h-[250px] items-center justify-center rounded-xl border border-slate-800 bg-slate-950/50 px-6 text-center">
                <div>
                  <div className="mb-3 text-4xl">
                    🔎
                  </div>

                  <p className="text-sm leading-6 text-slate-500">
                    Your detected QR code or barcode
                    result will appear here.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm leading-6 text-red-300">
                {error}
              </div>
            )}
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Local Scan History
              </p>

              <h2 className="mt-1 text-xl font-bold">
                Recent scans
              </h2>
            </div>

            {history.length > 0 && (
              <button
                type="button"
                onClick={clearHistory}
                className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                Clear History
              </button>
            )}
          </div>

          {history.length > 0 ? (
            <div className="mt-4 space-y-2">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4 sm:flex-row sm:items-center"
                >
                  <button
                    type="button"
                    onClick={() =>
                      selectHistoryItem(item)
                    }
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-blue-500/10 px-2 py-1 text-[11px] font-semibold text-blue-300">
                        {item.format}
                      </span>

                      <span className="text-xs text-slate-600">
                        {formatDate(
                          item.timestamp
                        )}
                      </span>
                    </div>

                    <p className="mt-2 truncate text-sm text-slate-300">
                      {item.text}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      removeHistoryItem(item.id)
                    }
                    className="self-end rounded-lg px-3 py-2 text-xs text-slate-500 transition hover:bg-slate-800 hover:text-red-300 sm:self-auto"
                    aria-label="Remove scan from history"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/50 p-6 text-center text-sm text-slate-500">
              No scans yet. Your successful scans
              will appear here.
            </div>
          )}
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="text-2xl">🔒</div>
            <h3 className="mt-3 font-semibold">
              Private by design
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Scanning happens directly in your
              browser. Files and camera frames are
              not uploaded.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="text-2xl">⚡</div>
            <h3 className="mt-3 font-semibold">
              Fast scanning
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Continuous camera decoding is used
              instead of requiring a separate scan
              button for every frame.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="text-2xl">🌐</div>
            <h3 className="mt-3 font-semibold">
              Browser first
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Works as a web tool rather than
              requiring a separate mobile application.
            </p>
          </div>
        </section>

        <div className="mt-8 text-center text-xs text-slate-600">
          QR & Barcode Scanner • FileForge
        </div>
      </div>
    </div>
  )
}