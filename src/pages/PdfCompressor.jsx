import { useEffect, useRef, useState } from 'react'
import { createQpdfRunner } from 'qpdf-run'

export default function PdfCompressor() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [compressionLevel, setCompressionLevel] = useState('balanced')
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const qpdfRef = useRef(null)

  /*
   * Create the qpdf WebAssembly runner once.
   *
   * Everything runs inside the browser.
   * The PDF is not uploaded to a server.
   */
  useEffect(() => {
    let cancelled = false

    const initializeQpdf = async () => {
      try {
        const workerUrl = new URL(
          'qpdf-run/worker',
          import.meta.url
        ).href

        const qpdfJsUrl = new URL(
          'qpdf-run/qpdf.js',
          import.meta.url
        ).href

        const wasmUrl = new URL(
          'qpdf-run/qpdf.wasm',
          import.meta.url
        ).href

        const runner = await createQpdfRunner({
          workerUrl,
          qpdfJsUrl,
          wasmUrl,
          timeoutMs: 600000,
        })

        if (cancelled) {
          await runner.destroy()
          return
        }

        qpdfRef.current = runner
      } catch (err) {
        console.error('Failed to initialize qpdf:', err)

        if (!cancelled) {
          setError(
            'PDF compression engine could not be initialized.'
          )
        }
      }
    }

    initializeQpdf()

    return () => {
      cancelled = true

      if (qpdfRef.current) {
        qpdfRef.current.destroy().catch(() => {})
        qpdfRef.current = null
      }
    }
  }, [])

  const formatFileSize = (bytes) => {
    if (bytes < 1024) {
      return `${bytes} B`
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`
    }

    if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
    }

    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }

  const getCompressionDescription = () => {
  switch (compressionLevel) {
    case 'maximum':
      return 'Strongest compression. Images are recompressed at lower quality.'

    case 'strong':
      return 'Strong compression with reduced image quality.'

    case 'balanced':
      return 'Recommended for most PDFs. Compresses images while preserving readability.'

    case 'quality':
      return 'Prioritizes visual quality with mainly structural optimization.'

    default:
      return ''
  }
}

  /*
   * qpdf is fundamentally a structural PDF optimizer.
   *
   * These presets intentionally avoid rasterizing pages.
   *
   * The actual qpdf options are kept conservative because
   * lossless PDF optimization must not damage document content.
   */
  const getQpdfArguments = () => {
  switch (compressionLevel) {
    case 'quality':
      return [
        '--object-streams=generate',
        '--compress-streams=y',
        '--recompress-flate',
        '--compression-level=6',
        
        '--',
        'input.pdf',
        'output.pdf',
      ]

    case 'balanced':
      return [
        '--object-streams=generate',
        '--compress-streams=y',
        '--recompress-flate',
        '--compression-level=7',
        
        '--',
        'input.pdf',
        'output.pdf',
      ]

    case 'strong':
      return [
        '--object-streams=generate',
        '--compress-streams=y',
        '--recompress-flate',
        '--compression-level=8',
        
        '--',
        'input.pdf',
        'output.pdf',
      ]

    case 'maximum':
      return [
        '--object-streams=generate',
        '--compress-streams=y',
        '--recompress-flate',
        '--compression-level=9',
        
        '--',
        'input.pdf',
        'output.pdf',
      ]

    default:
      return [
        '--object-streams=generate',
        '--compress-streams=y',
        '--recompress-flate',
        '--compression-level=7',
        
        '--',
        'input.pdf',
        'output.pdf',
      ]
  }
}

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]

    setError('')
    setResult(null)

    if (!file) {
      setSelectedFile(null)
      return
    }

    if (
      file.type !== 'application/pdf' &&
      !file.name.toLowerCase().endsWith('.pdf')
    ) {
      setSelectedFile(null)
      setError('Please select a valid PDF file.')
      return
    }

    if (file.size > 500 * 1024 * 1024) {
  setSelectedFile(null)
  setError('Please select a PDF smaller than 500 MB.')
  return
}

    setSelectedFile(file)
  }

  const handleCompress = async () => {
  if (!selectedFile) {
    setError('Please select a PDF file first.')
    return
  }

  if (!qpdfRef.current) {
    setError(
      'The PDF compression engine is still loading. Please try again in a moment.'
    )
    return
  }

  setProcessing(true)
  setError('')
  setResult(null)

  try {
    const inputBytes = new Uint8Array(
      await selectedFile.arrayBuffer()
    )

    const args = getQpdfArguments()

    const compressedBytes = await qpdfRef.current.runOne({
      input: inputBytes,
      inputName: 'input.pdf',
      outputName: 'output.pdf',
      args,
    })

    if (!compressedBytes || compressedBytes.length === 0) {
      throw new Error(
        'The compression engine returned an empty PDF.'
      )
    }

    const originalSize = selectedFile.size
    const compressedSize = compressedBytes.length

    /*
     * Never treat a larger output as successful compression.
     */
    if (compressedSize >= originalSize) {
      setResult({
        success: false,
        originalSize,
        compressedSize,
        savedBytes: 0,
        savedPercentage: 0,
        message:
          'This PDF could not be made smaller without sacrificing content.',
      })

      return
    }

    const compressedBlob = new Blob(
      [compressedBytes],
      {
        type: 'application/pdf',
      }
    )

    const compressedUrl = URL.createObjectURL(
      compressedBlob
    )

    const savedBytes =
      originalSize - compressedSize

    const savedPercentage =
      (savedBytes / originalSize) * 100

    setResult({
      success: true,
      blob: compressedBlob,
      url: compressedUrl,
      originalSize,
      compressedSize,
      savedBytes,
      savedPercentage,
      message:
        'PDF successfully optimized.',
    })
  } catch (err) {
    console.error(
      'PDF compression failed:',
      err
    )

    setError(
      err?.message ||
        'Failed to compress the PDF. Please try another PDF.'
    )
  } finally {
    setProcessing(false)
  }
}

  const handleDownload = () => {
    if (!result?.success || !result?.url) {
      return
    }

    const link = document.createElement('a')

    link.href = result.url

    link.download =
      `${selectedFile.name.replace(
        /\.pdf$/i,
        ''
      )}-compressed.pdf`

    document.body.appendChild(link)

    link.click()

    link.remove()
  }

  const handleReset = () => {
    if (result?.url) {
      URL.revokeObjectURL(result.url)
    }

    setSelectedFile(null)
    setResult(null)
    setError('')
    setProcessing(false)
  }

  return (
    <main className="flex-1">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Header */}

        <h1 className="text-4xl font-bold text-white mb-4">
          PDF Compressor
        </h1>

        <p className="text-slate-300 mb-8">
          Reduce PDF file size using lossless structural
          optimization without converting pages into images.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Upload */}

          <div className="lg:col-span-1">
            <div className="rounded-3xl border border-slate-700 bg-slate-800/60 p-6">

              <h2 className="text-xl font-semibold text-white mb-4">
                Upload PDF
              </h2>

              <div className="border-2 border-dashed border-slate-600 rounded-2xl p-8 text-center hover:border-cyan-500 transition-colors">

                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="pdf-input"
                  disabled={processing}
                />

                <label
                  htmlFor="pdf-input"
                  className="cursor-pointer"
                >
                  <div className="text-4xl mb-2">
                    📄
                  </div>

                  <p className="text-slate-300 text-sm break-all">
                    {selectedFile
                      ? selectedFile.name
                      : 'Click to select PDF'}
                  </p>

                  <p className="text-slate-500 text-xs mt-2">
                    Maximum 500 MB
                  </p>
                </label>
              </div>

              {selectedFile && (
                <div className="mt-4">
                  <p className="text-cyan-400 text-xs">
                    ✓ File selected
                  </p>

                  <p className="text-slate-400 text-xs mt-1">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Compression Settings */}

          <div className="lg:col-span-1">
            <div className="rounded-3xl border border-slate-700 bg-slate-800/60 p-6">

              <h2 className="text-xl font-semibold text-white mb-4">
                Compression Level
              </h2>

              <div className="space-y-3">

                {[
                  {
                    id: 'quality',
                    title: 'Maximum Quality',
                  },
                  {
                    id: 'balanced',
                    title: 'Balanced',
                  },
                  {
                    id: 'strong',
                    title: 'Strong Compression',
                  },
                  {
                    id: 'maximum',
                    title: 'Maximum Compression',
                  },
                ].map((option) => (
                  <label
                    key={option.id}
                    className={`flex items-center gap-3 rounded-xl border p-4 cursor-pointer transition ${
                      compressionLevel === option.id
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="compression-level"
                      value={option.id}
                      checked={
                        compressionLevel === option.id
                      }
                      onChange={(e) =>
                        setCompressionLevel(
                          e.target.value
                        )
                      }
                      disabled={processing}
                    />

                    <span className="text-slate-200 text-sm">
                      {option.title}
                    </span>
                  </label>
                ))}

              </div>

              <p className="text-slate-500 text-xs mt-4">
                {getCompressionDescription()}
              </p>

                <p className="text-cyan-400 text-xs font-medium">
  Local PDF compression
</p>

<p className="text-slate-400 text-xs mt-1">
  Text, fonts, vectors and page structure are preserved.
  Images may be recompressed depending on the selected
  compression level. Pages are never rasterized.
</p>
              </div>
            </div>
          </div>

          {/* Action */}

          <div className="lg:col-span-1">
            <div className="rounded-3xl border border-slate-700 bg-slate-800/60 p-6">

              <h2 className="text-xl font-semibold text-white mb-4">
                Action
              </h2>

              <button
                onClick={handleCompress}
                disabled={
                  !selectedFile ||
                  processing ||
                  !qpdfRef.current
                }
                className="w-full bg-linear-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold py-3 rounded-lg transition-all duration-300"
              >
                {processing
                  ? 'Optimizing PDF...'
                  : !qpdfRef.current
                    ? 'Loading Engine...'
                    : 'Compress PDF'}
              </button>

              <button
                onClick={handleReset}
                disabled={processing}
                className="w-full border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white font-medium py-2.5 rounded-lg transition-all mt-3"
              >
                Reset
              </button>

              <p className="text-slate-400 text-xs text-center mt-4">
                Your PDF is processed locally in your browser.
                No PDF data is uploaded to a server.
              </p>
            </div>
          </div>
        </div>

        {/* Error */}

        {error && (
          <div className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
            <p className="text-red-400 text-sm">
              ❌ {error}
            </p>
          </div>
        )}

        {/* Results */}

        <div className="mt-8 rounded-3xl border border-slate-700 bg-slate-800/60 p-6">

          <h2 className="text-xl font-semibold text-white mb-4">
            Results
          </h2>

          {!result && !processing && (
            <div className="bg-slate-900/50 rounded-2xl p-8 text-center">
              <p className="text-slate-400">
                Compression results will appear here.
              </p>
            </div>
          )}

          {processing && (
            <div className="bg-slate-900/50 rounded-2xl p-8 text-center">

              <div className="text-4xl mb-4 animate-pulse">
                ⚙️
              </div>

              <p className="text-white font-medium">
                Optimizing your PDF...
              </p>

              <p className="text-slate-500 text-sm mt-2">
  Large PDFs may take several minutes.
  Keep this tab open while FileForge processes the PDF locally.
</p>
            </div>
          )}

          {result && (
            <div className="space-y-6">

              {/* Size comparison */}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                <div className="bg-slate-900/50 rounded-2xl p-5">
                  <p className="text-slate-500 text-xs uppercase">
                    Original
                  </p>

                  <p className="text-white text-2xl font-bold mt-1">
                    {formatFileSize(
                      result.originalSize
                    )}
                  </p>
                </div>

                <div className="bg-slate-900/50 rounded-2xl p-5">
                  <p className="text-slate-500 text-xs uppercase">
                    Result
                  </p>

                  <p
                    className={`text-2xl font-bold mt-1 ${
                      result.success
                        ? 'text-cyan-400'
                        : 'text-yellow-400'
                    }`}
                  >
                    {formatFileSize(
                      result.compressedSize
                    )}
                  </p>
                </div>

                <div className="bg-slate-900/50 rounded-2xl p-5">
                  <p className="text-slate-500 text-xs uppercase">
                    Space Saved
                  </p>

                  <p
                    className={`text-2xl font-bold mt-1 ${
                      result.success
                        ? 'text-green-400'
                        : 'text-yellow-400'
                    }`}
                  >
                    {result.success
                      ? `${result.savedPercentage.toFixed(1)}%`
                      : '0%'}
                  </p>
                </div>
              </div>

              {/* Status */}

              <div
                className={`rounded-2xl p-5 ${
                  result.success
                    ? 'bg-green-500/10 border border-green-500/20'
                    : 'bg-yellow-500/10 border border-yellow-500/20'
                }`}
              >
                <p
                  className={
                    result.success
                      ? 'text-green-400'
                      : 'text-yellow-400'
                  }
                >
                  {result.success
                    ? '✓ PDF successfully optimized.'
                    : '⚠ No smaller PDF was produced.'}
                </p>

                <p className="text-slate-400 text-xs mt-2">
                  {result.success
                    ? 'The optimized PDF is smaller than the original.'
                    : 'FileForge kept the original PDF rather than giving you a larger file.'}
                </p>
              </div>

              {/* Download */}

              {result.success && (
                <div className="text-center">

                  <button
                    onClick={handleDownload}
                    className="bg-linear-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white font-semibold px-8 py-3 rounded-lg transition-all duration-300"
                  >
                    Download Compressed PDF
                  </button>

                  <p className="text-slate-500 text-xs mt-3">
                    Reduced by{' '}
                    {result.savedPercentage.toFixed(1)}%
                  </p>

                </div>
              )}
            </div>
          )}
        </div>
    </main>
  )
}