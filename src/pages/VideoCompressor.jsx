import { useEffect, useMemo, useRef, useState } from 'react'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'

const QUALITY_PRESETS = {
  maximum: {
    label: 'Maximum Quality',
    description: 'Best quality, moderate compression',
    crf: 20,
  },
  balanced: {
    label: 'Balanced',
    description: 'Best balance for most videos',
    crf: 24,
  },
  strong: {
    label: 'Strong Compression',
    description: 'Smaller file with good quality',
    crf: 28,
  },
  maximumCompression: {
    label: 'Maximum Compression',
    description: 'Smallest practical output',
    crf: 32,
  },
}

const RESOLUTION_PRESETS = {
  original: {
    label: 'Original',
    width: null,
    height: null,
  },
  2160: {
    label: '4K / 2160p',
    width: 3840,
    height: 2160,
  },
  1080: {
    label: '1080p',
    width: 1920,
    height: 1080,
  },
  720: {
    label: '720p',
    width: 1280,
    height: 720,
  },
  480: {
    label: '480p',
    width: 854,
    height: 480,
  },
}

const FPS_PRESETS = {
  original: {
    label: 'Original',
    value: null,
  },
  60: {
    label: '60 FPS',
    value: 60,
  },
  30: {
    label: '30 FPS',
    value: 30,
  },
  24: {
    label: '24 FPS',
    value: 24,
  },
}

const AUDIO_PRESETS = {
  128: {
    label: '128 kbps',
    value: '128k',
  },
  96: {
    label: '96 kbps',
    value: '96k',
  },
  64: {
    label: '64 kbps',
    value: '64k',
  },
}

const MAX_INPUT_SIZE = 1024 * 1024 * 1024

const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return '—'
  }

  if (bytes === 0) {
    return '0 B'
  }

  const units = ['B', 'KB', 'MB', 'GB']

  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  )

  return `${(
    bytes /
    Math.pow(1024, index)
  ).toFixed(index === 0 ? 0 : 2)} ${units[index]}`
}

const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '—'
  }

  const totalSeconds = Math.round(seconds)

  const hours = Math.floor(
    totalSeconds / 3600
  )

  const minutes = Math.floor(
    (totalSeconds % 3600) / 60
  )

  const secs =
    totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(
      2,
      '0'
    )}:${String(secs).padStart(2, '0')}`
  }

  return `${minutes}:${String(secs).padStart(
    2,
    '0'
  )}`
}

const getFileExtension = (name) => {
  const match =
    name.match(/\.([^.]+)$/)

  return match
    ? match[1].toLowerCase()
    : 'mp4'
}

const getOutputName = (name) => {
  const base =
    name.replace(/\.[^/.]+$/, '')

  return `${base}-compressed.mp4`
}

const getSupportedVideo = (file) => {
  if (!file) {
    return false
  }

  if (
    file.type &&
    file.type.startsWith('video/')
  ) {
    return true
  }

  return /\.(mp4|m4v|mov|webm|mkv|avi|mpeg|mpg|3gp|ts|mts|m2ts|ogv)$/i.test(
    file.name
  )
}

const getScaleFilter = (resolution) => {
  const preset =
    RESOLUTION_PRESETS[resolution]

  if (
    !preset?.width ||
    !preset?.height
  ) {
    return null
  }

  return `scale=${preset.width}:${preset.height}:force_original_aspect_ratio=decrease:force_divisible_by=2`
}

export default function VideoCompressor() {
  const ffmpegRef =
    useRef(null)

  const ffmpegLoadedRef =
    useRef(false)

  const progressHandlerRef =
    useRef(null)

  const inputUrlRef =
    useRef(null)

  const outputUrlRef =
    useRef(null)

  const cancelledRef =
    useRef(false)

  const [videoFile, setVideoFile] =
    useState(null)

  const [inputPreview, setInputPreview] =
    useState(null)

  const [outputPreview, setOutputPreview] =
    useState(null)

  const [metadata, setMetadata] =
    useState({
      duration: 0,
      width: 0,
      height: 0,
    })

  const [quality, setQuality] =
    useState('balanced')

  const [resolution, setResolution] =
    useState('original')

  const [fps, setFps] =
    useState('original')

  const [keepAudio, setKeepAudio] =
    useState(true)

  const [audioBitrate, setAudioBitrate] =
    useState('128')

  const [processing, setProcessing] =
    useState(false)

  const [progress, setProgress] =
    useState(0)

  const [stage, setStage] =
    useState('')

  const [error, setError] =
    useState('')

  const [engineReady, setEngineReady] =
    useState(false)

  const [outputInfo, setOutputInfo] =
    useState(null)

  const selectedQuality =
    QUALITY_PRESETS[quality]

  const selectedResolution =
    RESOLUTION_PRESETS[resolution]

  const outputFileName =
    useMemo(() => {
      if (!videoFile) {
        return 'compressed-video.mp4'
      }

      return getOutputName(
        videoFile.name
      )
    }, [videoFile])

  const getAssetBase = () => {
    const base =
      import.meta.env.BASE_URL || '/'

    return base.endsWith('/')
      ? base
      : `${base}/`
  }

  const getCoreUrls = () => {
    const base =
      getAssetBase()

    return {
      coreURL:
        `${window.location.origin}${base}ffmpeg/ffmpeg-core.js`,

      wasmURL:
        `${window.location.origin}${base}ffmpeg/ffmpeg-core.wasm`,
    }
  }

  const ensureEngine = async () => {
    if (
      ffmpegRef.current &&
      ffmpegLoadedRef.current
    ) {
      return ffmpegRef.current
    }

    const ffmpeg =
      ffmpegRef.current ||
      new FFmpeg()

    ffmpegRef.current =
      ffmpeg

    setStage(
      'Loading local video engine...'
    )

    setProgress(5)

    try {
      const {
        coreURL,
        wasmURL,
      } = getCoreUrls()

      await ffmpeg.load({
        coreURL,
        wasmURL,
      })

      ffmpegLoadedRef.current =
        true

      setEngineReady(true)

      return ffmpeg
    } catch (loadError) {
      ffmpegLoadedRef.current =
        false

      setEngineReady(false)

      throw new Error(
        `Could not load the local FFmpeg engine. Check public/ffmpeg/ffmpeg-core.js and public/ffmpeg/ffmpeg-core.wasm. ${
          loadError?.message || ''
        }`.trim()
      )
    }
  }

  const removeProgressListener = () => {
    const ffmpeg =
      ffmpegRef.current

    if (
      ffmpeg &&
      progressHandlerRef.current
    ) {
      ffmpeg.off(
        'progress',
        progressHandlerRef.current
      )

      progressHandlerRef.current =
        null
    }
  }

  const readVideoMetadata = (url) => {
    return new Promise(
      (resolve, reject) => {
        const video =
          document.createElement('video')

        video.preload =
          'metadata'

        video.muted =
          true

        video.playsInline =
          true

        const cleanup = () => {
          video.removeAttribute('src')
          video.load()
        }

        video.onloadedmetadata =
          () => {
            const result = {
              duration:
                Number(video.duration) || 0,

              width:
                Number(video.videoWidth) || 0,

              height:
                Number(video.videoHeight) || 0,
            }

            cleanup()

            resolve(result)
          }

        video.onerror =
          () => {
            cleanup()

            reject(
              new Error(
                'The selected video could not be read by the browser.'
              )
            )
          }

        video.src =
          url
      }
    )
  }

  const handleFileSelect =
    async (event) => {
      const file =
        event.target.files?.[0]

      if (!file) {
        return
      }

      setError('')
      setOutputInfo(null)
      setOutputPreview(null)
      setProgress(0)
      setStage('')
      cancelledRef.current = false

      if (!getSupportedVideo(file)) {
        setVideoFile(null)
        setInputPreview(null)

        setError(
          'Please select a valid video file.'
        )

        return
      }

      if (
        file.size >
        MAX_INPUT_SIZE
      ) {
        setVideoFile(null)
        setInputPreview(null)

        setError(
          'This video is larger than the current 1 GB browser-processing limit.'
        )

        return
      }

      const previewUrl =
        URL.createObjectURL(file)

      try {
        const info =
          await readVideoMetadata(
            previewUrl
          )

        if (
          !info.width ||
          !info.height
        ) {
          throw new Error(
            'Could not determine the video resolution.'
          )
        }

        if (
          inputUrlRef.current
        ) {
          URL.revokeObjectURL(
            inputUrlRef.current
          )
        }

        if (
          outputUrlRef.current
        ) {
          URL.revokeObjectURL(
            outputUrlRef.current
          )

          outputUrlRef.current =
            null
        }

        inputUrlRef.current =
          previewUrl

        setVideoFile(file)
        setInputPreview(
          previewUrl
        )

        setMetadata(info)
      } catch (selectionError) {
        URL.revokeObjectURL(
          previewUrl
        )

        setVideoFile(null)
        setInputPreview(null)

        setMetadata({
          duration: 0,
          width: 0,
          height: 0,
        })

        setError(
          selectionError?.message ||
            'Unable to read this video.'
        )
      }
    }

  const buildArguments =
    () => {
      const args = [
        '-i',
        'input-video',
        '-map',
        '0:v:0',
      ]

      if (keepAudio) {
        args.push(
          '-map',
          '0:a:0?'
        )
      }

      args.push(
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-crf',
        String(
          selectedQuality.crf
        ),
        '-pix_fmt',
        'yuv420p'
      )

      const scale =
        getScaleFilter(
          resolution
        )

      if (scale) {
        args.push(
          '-vf',
          scale
        )
      }

      if (
        fps !== 'original'
      ) {
        args.push(
          '-r',
          String(
            FPS_PRESETS[fps].value
          )
        )
      }

      if (keepAudio) {
        args.push(
          '-c:a',
          'aac',
          '-b:a',
          AUDIO_PRESETS[
            audioBitrate
          ].value,
          '-ac',
          '2'
        )
      } else {
        args.push(
          '-an'
        )
      }

      args.push(
        '-movflags',
        '+faststart',
        'output.mp4'
      )

      return args
    }

  const compressVideo =
    async () => {
      if (
        !videoFile ||
        processing
      ) {
        return
      }

      cancelledRef.current =
        false

      setProcessing(true)
      setError('')
      setOutputInfo(null)
      setOutputPreview(null)
      setProgress(1)
      setStage(
        'Preparing video...'
      )

      let ffmpeg = null

      try {
        ffmpeg =
          await ensureEngine()

        if (
          cancelledRef.current
        ) {
          return
        }

        setProgress(10)
        setStage(
          'Reading video...'
        )

        const inputData =
          await fetchFile(
            videoFile
          )

        await ffmpeg.writeFile(
          'input-video',
          inputData
        )

        if (
          cancelledRef.current
        ) {
          return
        }

        const progressHandler =
          ({ progress }) => {
            if (
              !Number.isFinite(
                progress
              )
            ) {
              return
            }

            const mapped =
              15 +
              Math.min(
                1,
                Math.max(
                  0,
                  progress
                )
              ) *
                80

            setProgress(
              Math.round(mapped)
            )

            setStage(
              'Compressing video...'
            )
          }

        progressHandlerRef.current =
          progressHandler

        ffmpeg.on(
          'progress',
          progressHandler
        )

        setProgress(15)
        setStage(
          'Compressing video...'
        )

        const exitCode =
          await ffmpeg.exec(
            buildArguments()
          )

        removeProgressListener()

        if (
          cancelledRef.current
        ) {
          return
        }

        if (
          exitCode !== 0
        ) {
          throw new Error(
            'FFmpeg could not complete the compression.'
          )
        }

        setProgress(96)
        setStage(
          'Preparing compressed video...'
        )

        const outputData =
          await ffmpeg.readFile(
            'output.mp4'
          )

        if (
          cancelledRef.current
        ) {
          return
        }

        const outputBytes =
          outputData instanceof Uint8Array
            ? outputData
            : new Uint8Array(
                outputData
              )

        const outputBlob =
          new Blob(
            [outputBytes],
            {
              type: 'video/mp4',
            }
          )

        if (
          outputUrlRef.current
        ) {
          URL.revokeObjectURL(
            outputUrlRef.current
          )
        }

        const outputUrl =
          URL.createObjectURL(
            outputBlob
          )

        outputUrlRef.current =
          outputUrl

        const originalSize =
          videoFile.size

        const compressedSize =
          outputBlob.size

        const savedBytes =
          originalSize -
          compressedSize

        const savedPercent =
          originalSize > 0
            ? (
                savedBytes /
                originalSize
              ) *
              100
            : 0

        setOutputPreview(
          outputUrl
        )

        setOutputInfo({
          originalSize,
          compressedSize,
          savedBytes,
          savedPercent,
          width:
            resolution === 'original'
              ? metadata.width
              : selectedResolution.width,

          height:
            resolution === 'original'
              ? metadata.height
              : selectedResolution.height,
        })

        setProgress(100)
        setStage(
          'Compression complete'
        )
      } catch (compressionError) {
        removeProgressListener()

        if (
          cancelledRef.current
        ) {
          return
        }

        console.error(
          'Video compression failed:',
          compressionError
        )

        setError(
          compressionError?.message ||
            'Failed to compress the video.'
        )

        setProgress(0)
        setStage('')
      } finally {
        if (
          ffmpeg?.loaded
        ) {
          try {
            await ffmpeg.deleteFile(
              'input-video'
            )
          } catch {
            // Ignore temporary file cleanup failure.
          }

          try {
            await ffmpeg.deleteFile(
              'output.mp4'
            )
          } catch {
            // Ignore temporary file cleanup failure.
          }
        }

        removeProgressListener()
        setProcessing(false)
      }
    }

  const cancelCompression =
    () => {
      if (!processing) {
        return
      }

      cancelledRef.current =
        true

      setStage(
        'Cancelling compression...'
      )

      removeProgressListener()

      const ffmpeg =
        ffmpegRef.current

      if (ffmpeg) {
        try {
          ffmpeg.terminate()
        } catch {
          // Ignore termination failure.
        }
      }

      ffmpegRef.current =
        null

      ffmpegLoadedRef.current =
        false

      setEngineReady(false)
      setProcessing(false)
      setProgress(0)
      setStage('')
    }

  const downloadVideo =
    () => {
      if (!outputPreview) {
        return
      }

      const link =
        document.createElement('a')

      link.href =
        outputPreview

      link.download =
        outputFileName

      document.body.appendChild(
        link
      )

      link.click()
      link.remove()
    }

  const clearVideo =
    () => {
      if (processing) {
        return
      }

      if (
        inputUrlRef.current
      ) {
        URL.revokeObjectURL(
          inputUrlRef.current
        )

        inputUrlRef.current =
          null
      }

      if (
        outputUrlRef.current
      ) {
        URL.revokeObjectURL(
          outputUrlRef.current
        )

        outputUrlRef.current =
          null
      }

      setVideoFile(null)
      setInputPreview(null)
      setOutputPreview(null)

      setMetadata({
        duration: 0,
        width: 0,
        height: 0,
      })

      setOutputInfo(null)
      setError('')
      setProgress(0)
      setStage('')
    }

  useEffect(() => {
    return () => {
      removeProgressListener()

      const ffmpeg =
        ffmpegRef.current

      if (ffmpeg) {
        try {
          ffmpeg.terminate()
        } catch {
          // Ignore cleanup failure.
        }
      }

      if (
        inputUrlRef.current
      ) {
        URL.revokeObjectURL(
          inputUrlRef.current
        )
      }

      if (
        outputUrlRef.current
      ) {
        URL.revokeObjectURL(
          outputUrlRef.current
        )
      }
    }
  }, [])

  return (
    <main className="flex-1">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Header */}

        <div className="mb-10">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">

            <div>
              <h1 className="text-4xl font-bold text-white mb-4">
                Video Compressor
              </h1>

              <p className="text-slate-300 max-w-2xl">
                Compress your videos locally in your browser
                with professional quality controls and no
                server upload.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 self-start lg:self-auto rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              100% local processing
            </div>

          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

          {/* SOURCE */}

          <div className="space-y-8">

            <section className="bg-slate-800 rounded-3xl border border-slate-700 p-6 sm:p-8">

              <div className="flex items-center justify-between mb-6">

                <div>
                  <h2 className="text-xl font-semibold text-white">
                    Source Video
                  </h2>

                  <p className="text-sm text-slate-400 mt-1">
                    Select a video from your device.
                  </p>
                </div>

                {videoFile && (
                  <button
                    type="button"
                    onClick={clearVideo}
                    disabled={processing}
                    className="text-sm text-slate-400 hover:text-white disabled:opacity-40"
                  >
                    Clear
                  </button>
                )}

              </div>

              <input
                type="file"
                accept="video/*,.mkv,.avi,.mov,.m4v,.mts,.m2ts,.ts"
                onChange={handleFileSelect}
                disabled={processing}
                className="block w-full text-slate-300 mb-6"
              />

              {inputPreview ? (
                <div className="rounded-2xl overflow-hidden bg-black border border-slate-700">
                  <video
                    src={inputPreview}
                    controls
                    playsInline
                    preload="metadata"
                    className="w-full max-h-[520px] bg-black"
                  />
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 py-24 text-center">

                  <div className="text-5xl mb-4">
                    🎬
                  </div>

                  <p className="text-slate-400">
                    No video selected
                  </p>

                  <p className="text-slate-500 text-sm mt-2">
                    MP4, MOV, WebM, MKV and other common formats
                  </p>

                </div>
              )}

              {videoFile && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">

                  <div className="rounded-xl bg-slate-900/70 p-3">
                    <p className="text-xs text-slate-500">
                      File size
                    </p>

                    <p className="text-sm font-semibold text-white mt-1">
                      {formatBytes(
                        videoFile.size
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-900/70 p-3">
                    <p className="text-xs text-slate-500">
                      Duration
                    </p>

                    <p className="text-sm font-semibold text-white mt-1">
                      {formatDuration(
                        metadata.duration
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-900/70 p-3">
                    <p className="text-xs text-slate-500">
                      Resolution
                    </p>

                    <p className="text-sm font-semibold text-white mt-1">
                      {metadata.width} × {metadata.height}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-900/70 p-3">
                    <p className="text-xs text-slate-500">
                      Engine
                    </p>

                    <p className="text-sm font-semibold text-white mt-1">
                      {engineReady
                        ? 'Ready'
                        : 'On demand'}
                    </p>
                  </div>

                </div>
              )}

            </section>

            {/* SETTINGS */}

            <section className="bg-slate-800 rounded-3xl border border-slate-700 p-6 sm:p-8">

              <h2 className="text-xl font-semibold text-white mb-7">
                Compression Settings
              </h2>

              {/* QUALITY */}

              <div className="mb-8">

                <div className="flex items-start justify-between gap-4 mb-3">

                  <div>
                    <label className="text-sm font-semibold text-white">
                      Quality
                    </label>

                    <p className="text-xs text-slate-500 mt-1">
                      {selectedQuality.description}
                    </p>
                  </div>

                  <span className="text-xs text-slate-400">
                    CRF {selectedQuality.crf}
                  </span>

                </div>

                <div className="grid grid-cols-2 gap-3">

                  {Object.entries(
                    QUALITY_PRESETS
                  ).map(
                    ([key, preset]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() =>
                          setQuality(key)
                        }
                        disabled={processing}
                        className={`text-left rounded-xl border p-4 transition ${
                          quality === key
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-slate-700 bg-slate-900/50 hover:border-slate-600'
                        } disabled:opacity-50`}
                      >

                        <p className="text-sm font-semibold text-white">
                          {preset.label}
                        </p>

                        <p className="text-xs text-slate-500 mt-1">
                          CRF {preset.crf}
                        </p>

                      </button>
                    )
                  )}

                </div>

              </div>

              {/* RESOLUTION */}

              <div className="mb-7">

                <label className="block text-sm font-semibold text-white mb-3">
                  Maximum Resolution
                </label>

                <select
                  value={resolution}
                  onChange={(event) =>
                    setResolution(
                      event.target.value
                    )
                  }
                  disabled={processing}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-blue-500 disabled:opacity-50"
                >

                  {Object.entries(
                    RESOLUTION_PRESETS
                  ).map(
                    ([key, preset]) => (
                      <option
                        key={key}
                        value={key}
                      >
                        {preset.label}
                        {preset.width
                          ? ` — ${preset.width} × ${preset.height} max`
                          : ''}
                      </option>
                    )
                  )}

                </select>

              </div>

              {/* FPS */}

              <div className="mb-7">

                <label className="block text-sm font-semibold text-white mb-3">
                  Frame Rate
                </label>

                <select
                  value={fps}
                  onChange={(event) =>
                    setFps(
                      event.target.value
                    )
                  }
                  disabled={processing}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-blue-500 disabled:opacity-50"
                >

                  {Object.entries(
                    FPS_PRESETS
                  ).map(
                    ([key, preset]) => (
                      <option
                        key={key}
                        value={key}
                      >
                        {preset.label}
                      </option>
                    )
                  )}

                </select>

              </div>

              {/* AUDIO */}

              <div>

                <div className="flex items-center justify-between gap-4 mb-3">

                  <div>
                    <label className="text-sm font-semibold text-white">
                      Audio
                    </label>

                    <p className="text-xs text-slate-500 mt-1">
                      Preserve the original audio track.
                    </p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={keepAudio}
                    onClick={() =>
                      setKeepAudio(
                        (value) => !value
                      )
                    }
                    disabled={processing}
                    className={`relative h-6 w-11 rounded-full transition ${
                      keepAudio
                        ? 'bg-blue-500'
                        : 'bg-slate-600'
                    } disabled:opacity-50`}
                  >

                    <span
                      className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
                        keepAudio
                          ? 'left-6'
                          : 'left-1'
                      }`}
                    />

                  </button>

                </div>

                {keepAudio && (
                  <select
                    value={audioBitrate}
                    onChange={(event) =>
                      setAudioBitrate(
                        event.target.value
                      )
                    }
                    disabled={processing}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-blue-500 disabled:opacity-50"
                  >

                    {Object.entries(
                      AUDIO_PRESETS
                    ).map(
                      ([key, preset]) => (
                        <option
                          key={key}
                          value={key}
                        >
                          {preset.label}
                        </option>
                      )
                    )}

                  </select>
                )}

              </div>

              {/* ACTION */}

              <div className="mt-8">

                {!processing ? (
                  <button
                    type="button"
                    onClick={
                      compressVideo
                    }
                    disabled={!videoFile}
                    className="w-full px-6 py-3.5 rounded-xl font-semibold text-white bg-linear-to-r from-blue-500 to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] transition-transform"
                  >
                    Compress Video
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={
                      cancelCompression
                    }
                    className="w-full px-6 py-3.5 rounded-xl font-semibold text-white bg-red-500/90 hover:bg-red-500 transition"
                  >
                    Cancel Compression
                  </button>
                )}

              </div>

              {/* PROGRESS */}

              {(processing ||
                progress > 0) && (
                <div className="mt-6">

                  <div className="flex justify-between text-xs mb-2">

                    <span className="text-slate-400">
                      {stage}
                    </span>

                    <span className="text-blue-400 font-semibold">
                      {Math.round(
                        progress
                      )}
                      %
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

                  {processing && (
                    <p className="text-center text-xs text-slate-500 mt-3">
                      Processing is happening locally on this device.
                    </p>
                  )}

                </div>
              )}

              {/* ERROR */}

              {error && (
                <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4">

                  <p className="text-red-400 text-sm">
                    ❌ {error}
                  </p>

                </div>
              )}

            </section>

          </div>

          {/* RESULT */}

          <section className="bg-slate-800 rounded-3xl border border-slate-700 p-6 sm:p-8 h-fit">

            <div className="flex items-center justify-between gap-4 mb-6">

              <div>
                <h2 className="text-xl font-semibold text-white">
                  Compressed Video
                </h2>

                <p className="text-sm text-slate-400 mt-1">
                  Review and download the result.
                </p>
              </div>

              {outputInfo && (
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                  Ready
                </span>
              )}

            </div>

            {outputPreview ? (
              <>

                <div className="rounded-2xl overflow-hidden bg-black border border-slate-700">

                  <video
                    src={outputPreview}
                    controls
                    playsInline
                    preload="metadata"
                    className="w-full max-h-[520px] bg-black"
                  />

                </div>

                {outputInfo && (
                  <div className="mt-5 space-y-4">

                    <div className="rounded-2xl bg-slate-900/70 p-5">

                      <div className="flex justify-between text-sm mb-3">

                        <span className="text-slate-400">
                          Original size
                        </span>

                        <span className="text-white font-medium">
                          {formatBytes(
                            outputInfo.originalSize
                          )}
                        </span>

                      </div>

                      <div className="flex justify-between text-sm mb-3">

                        <span className="text-slate-400">
                          Compressed size
                        </span>

                        <span className="text-white font-medium">
                          {formatBytes(
                            outputInfo.compressedSize
                          )}
                        </span>

                      </div>

                      <div className="flex justify-between text-sm mb-3">

                        <span className="text-slate-400">
                          Output resolution
                        </span>

                        <span className="text-white font-medium">
                          {outputInfo.width} × {outputInfo.height}
                        </span>

                      </div>

                      <div className="flex justify-between text-sm">

                        <span className="text-slate-400">
                          Space saved
                        </span>

                        <span
                          className={
                            outputInfo.savedPercent > 0
                              ? 'text-emerald-400 font-semibold'
                              : 'text-amber-400 font-semibold'
                          }
                        >
                          {outputInfo.savedPercent > 0
                            ? `${outputInfo.savedPercent.toFixed(1)}%`
                            : 'No reduction'}
                        </span>

                      </div>

                    </div>

                    <button
                      type="button"
                      onClick={
                        downloadVideo
                      }
                      className="w-full px-6 py-3.5 rounded-xl font-semibold text-white bg-linear-to-r from-blue-500 to-purple-600 hover:scale-[1.01] transition-transform"
                    >
                      Download Compressed Video
                    </button>

                  </div>
                )}

              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 py-28 text-center">

                <div className="text-5xl mb-5">
                  📦
                </div>

                <p className="text-slate-400">
                  Your compressed video will appear here
                </p>

                <p className="text-slate-500 text-sm mt-2">
                  Select a video and choose your compression settings.
                </p>

              </div>
            )}

            <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-900/50 p-5">

              <div className="flex gap-3">

                <div className="text-emerald-400 text-lg">
                  🔒
                </div>

                <div>
                  <p className="text-sm font-semibold text-white">
                    Your video stays on your device
                  </p>

                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    FileForge uses a local WebAssembly video
                    engine. The selected video is processed
                    inside your browser and is not uploaded to
                    a compression server.
                  </p>
                </div>

              </div>

            </div>

          </section>

        </div>

        {/* INFO */}

        <section className="mt-8 rounded-3xl border border-slate-700 bg-slate-800/50 p-6">

          <h3 className="text-lg font-semibold text-white mb-5">
            How it works
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

            <div>
              <p className="text-blue-400 font-semibold">
                01
              </p>

              <p className="text-slate-300 text-sm mt-1">
                Select your video
              </p>

              <p className="text-slate-500 text-xs mt-1">
                The source file remains on your device.
              </p>
            </div>

            <div>
              <p className="text-blue-400 font-semibold">
                02
              </p>

              <p className="text-slate-300 text-sm mt-1">
                Choose quality
              </p>

              <p className="text-slate-500 text-xs mt-1">
                Control quality, resolution, FPS and audio.
              </p>
            </div>

            <div>
              <p className="text-blue-400 font-semibold">
                03
              </p>

              <p className="text-slate-300 text-sm mt-1">
                Compress locally
              </p>

              <p className="text-slate-500 text-xs mt-1">
                FFmpeg runs inside a browser worker.
              </p>
            </div>

            <div>
              <p className="text-blue-400 font-semibold">
                04
              </p>

              <p className="text-slate-300 text-sm mt-1">
                Download MP4
              </p>

              <p className="text-slate-500 text-xs mt-1">
                Get the compressed video directly on your device.
              </p>
            </div>

          </div>

        </section>

      </div>
    </main>
  )
}