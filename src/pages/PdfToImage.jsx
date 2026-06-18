import { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import JSZip from 'jszip'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

export default function PdfToImage() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [format, setFormat] = useState('png')
  const [dpi, setDpi] = useState(150)
  const [processing, setProcessing] = useState(false)
  const [pageCount, setPageCount] = useState(null)
  const [images, setImages] = useState([])
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const pdfDocRef = useRef(null)

  useEffect(() => {
    return () => {
      // cleanup object URLs
      images.forEach((img) => URL.revokeObjectURL(img.url))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    setErrorMessage('')
    setStatusMessage('')
    setImages([])
    setPageCount(null)
    pdfDocRef.current = null

    if (file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
      setSelectedFile(file)
      try {
        const arrayBuffer = await file.arrayBuffer()
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
        const pdf = await loadingTask.promise
        pdfDocRef.current = pdf
        setPageCount(pdf.numPages)
      } catch (err) {
        console.error(err)
        setErrorMessage('Failed to read PDF. Please select a valid PDF file.')
        setSelectedFile(null)
      }
    } else {
      setSelectedFile(null)
      setErrorMessage('Please select a valid PDF file.')
    }
  }

  const renderPageToBlob = async (pdf, pageNumber, scale, mimeType, quality) => {
    const page = await pdf.getPage(pageNumber)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)

    const renderTask = page.render({ canvasContext: context, viewport })
    await renderTask.promise

    const blob = await new Promise((resolve) => {
      if (mimeType === 'image/png') {
        canvas.toBlob(resolve, 'image/png')
      } else {
        canvas.toBlob(resolve, 'image/jpeg', quality)
      }
    })

    return blob
  }

  const handleConvert = async () => {
    setErrorMessage('')
    setStatusMessage('')
    setImages([])

    if (!selectedFile) {
      setErrorMessage('Please select a PDF file first.')
      return
    }
    if (!pdfDocRef.current) {
      setErrorMessage('PDF not loaded. Please re-upload the file.')
      return
    }

    const pdf = pdfDocRef.current
    const total = pdf.numPages
    const scale = dpi / 72 // pdfjs baseline is 72 DPI
    const mimeType = format === 'png' ? 'image/png' : 'image/jpeg'
    const quality = format === 'jpg' ? 0.9 : undefined

    setProcessing(true)
    try {
      const created = []
      for (let i = 1; i <= total; i++) {
        setStatusMessage(`Converting page ${i} of ${total}...`)
        // Render page
        try {
          const blob = await renderPageToBlob(pdf, i, scale, mimeType, quality)
          const url = URL.createObjectURL(blob)
          const entry = { page: i, blob, url }
          created.push(entry)
          // update preview progressively
          setImages((prev) => [...prev, entry])
        } catch (pageErr) {
          console.error('Page render error', pageErr)
          // continue with other pages
        }
      }

      if (created.length === 0) {
        setErrorMessage('No pages were converted. The PDF may be corrupted.')
      } else {
        setStatusMessage(`Converted ${created.length} of ${total} pages.`)
      }
    } catch (err) {
      console.error(err)
      setErrorMessage('Conversion failed. Please try again with a different file.')
    } finally {
      setProcessing(false)
    }
  }

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const handleDownloadImage = (img) => {
    const ext = format === 'png' ? 'png' : 'jpg'
    const base = selectedFile ? selectedFile.name.replace(/\.pdf$/i, '') : 'pages'
    downloadBlob(img.blob, `${base}_page-${img.page}.${ext}`)
  }

  const handleDownloadAll = async () => {
    if (!images.length) {
      setErrorMessage('No images to download. Convert the PDF first.')
      return
    }
    setProcessing(true)
    setStatusMessage('Creating ZIP archive...')
    try {
      const zip = new JSZip()
      const ext = format === 'png' ? 'png' : 'jpg'
      const base = selectedFile ? selectedFile.name.replace(/\.pdf$/i, '') : 'pages'
      for (const img of images) {
        zip.file(`${base}_page-${img.page}.${ext}`, img.blob)
      }
      const content = await zip.generateAsync({ type: 'blob' })
      downloadBlob(content, `${base}_pages.zip`)
      setStatusMessage('ZIP created and download started.')
    } catch (err) {
      console.error(err)
      setErrorMessage('Failed to create ZIP. Try again.')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <main className="flex-1">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-white mb-4">PDF to Image</h1>
        <p className="text-slate-300 mb-8">
          Export PDF pages as PNG or JPG images with customizable resolution and quality.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Section */}
          <div className="lg:col-span-1">
            <div className="rounded-3xl border border-slate-700 bg-slate-800/60 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Upload PDF</h2>
              <div className="border-2 border-dashed border-slate-600 rounded-2xl p-8 text-center hover:border-cyan-500 transition-colors cursor-pointer">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="pdf-input"
                />
                <label htmlFor="pdf-input" className="cursor-pointer">
                  <div className="text-4xl mb-2">📄</div>
                  <p className="text-slate-300 text-sm">
                    {selectedFile ? selectedFile.name : 'Click to select PDF'}
                  </p>
                  <p className="text-slate-500 text-xs mt-2">Max 50MB</p>
                </label>
              </div>
              {selectedFile && (
                <div className="mt-3 space-y-2">
                  <p className="text-cyan-400 text-xs">✓ File selected</p>
                  {pageCount !== null && (
                    <p className="text-slate-400 text-xs">
                      Total pages: <span className="text-cyan-400">{pageCount}</span>
                    </p>
                  )}
                </div>
              )}
              {errorMessage && (
                <p className="text-rose-400 text-xs mt-3">{errorMessage}</p>
              )}
            </div>
          </div>

          {/* Settings Section */}
          <div className="lg:col-span-1">
            <div className="rounded-3xl border border-slate-700 bg-slate-800/60 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Export Options</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Format</label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                  >
                    <option value="png">PNG (Lossless)</option>
                    <option value="jpg">JPG (Compressed)</option>
                  </select>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm text-slate-300">DPI (Resolution)</label>
                    <span className="text-sm text-cyan-400 font-semibold">{dpi}</span>
                  </div>
                  <input
                    type="range"
                    min="72"
                    max="300"
                    step="12"
                    value={dpi}
                    onChange={(e) => setDpi(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Section */}
          <div className="lg:col-span-1">
            <div className="rounded-3xl border border-slate-700 bg-slate-800/60 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Action</h2>
              <button
                onClick={handleConvert}
                disabled={!selectedFile || processing}
                className="w-full bg-linear-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:scale-100 mb-4"
              >
                {processing ? 'Converting...' : 'Convert to Image'}
              </button>
              <p className="text-slate-400 text-xs text-center">
                Your files are processed in your browser. No data is uploaded to servers.
              </p>
            </div>
          </div>
        </div>

        {/* Result Panel */}
        <div className="mt-8 rounded-3xl border border-slate-700 bg-slate-800/60 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Results</h2>
          <div className="bg-slate-900/50 rounded-2xl p-8">
            {errorMessage ? (
              <p className="text-rose-400">{errorMessage}</p>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-slate-300">{statusMessage || 'Converted images will appear below.'}</div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDownloadAll}
                      disabled={!images.length || processing}
                      className="px-3 py-1 rounded-md bg-cyan-600 text-white text-sm disabled:opacity-50"
                    >
                      Download All as ZIP
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {images.map((img) => (
                    <div key={img.page} className="bg-slate-800/40 rounded-xl p-3 text-center">
                      <div className="mb-2 text-sm text-slate-300">Page {img.page}</div>
                      <img src={img.url} alt={`Page ${img.page}`} className="mx-auto rounded-md max-h-44" />
                      <div className="mt-3 flex gap-2 justify-center">
                        <button
                          onClick={() => handleDownloadImage(img)}
                          className="px-3 py-1 rounded-md bg-blue-600 text-white text-sm"
                        >
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
