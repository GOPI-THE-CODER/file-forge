import { useEffect, useRef, useState } from 'react'
import { createWorker } from 'tesseract.js'

export default function OcrTextExtractor() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [language, setLanguage] = useState('eng')
  const [processing, setProcessing] = useState(false)
  const [ocrText, setOcrText] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const workerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
      if (workerRef.current && typeof workerRef.current.terminate === 'function') {
        workerRef.current.terminate().catch(() => {})
      }
    }
  }, [previewUrl])

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setSelectedFile(null)
      setPreviewUrl('')
      setOcrText('')
      setErrorMessage('Please select a valid image or PDF file.')
      setStatusMessage('')
      return
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    setSelectedFile(file)
    setPreviewUrl(file.type.startsWith('image/') ? URL.createObjectURL(file) : '')
    setOcrText('')
    setStatusMessage('File selected. Ready to extract text.')
    setErrorMessage('')
  }

  const handleExtract = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select a file first.')
      setStatusMessage('')
      return
    }

    if (selectedFile.type === 'application/pdf') {
      setErrorMessage('PDF OCR is not supported in this browser build. Please upload a JPG or PNG image.')
      setStatusMessage('')
      return
    }

    setProcessing(true)
    setOcrText('')
    setErrorMessage('')
    setStatusMessage('Initializing OCR...')

    let worker
    try {
      worker = await createWorker(language)
      workerRef.current = worker

      setStatusMessage('Recognizing text...')
      const { data } = await worker.recognize(selectedFile)
      const extractedText = data?.text?.trim() || ''

      if (extractedText) {
        setOcrText(extractedText)
        setStatusMessage('OCR completed successfully.')
      } else {
        setOcrText('')
        setStatusMessage('OCR completed, but no text was detected.')
      }
    } catch (err) {
      console.error('OCR failed:', err)
      setErrorMessage(`OCR failed: ${err?.message || 'Please try a different image.'}`)
      setStatusMessage('')
    } finally {
      if (worker && typeof worker.terminate === 'function') {
        try {
          await worker.terminate()
        } catch (terminateError) {
          console.warn('Worker termination failed:', terminateError)
        }
      }
      setProcessing(false)
    }
  }

  const handleCopyText = async () => {
    if (!ocrText.trim()) return

    try {
      await navigator.clipboard.writeText(ocrText)
      setStatusMessage('Extracted text copied to clipboard.')
      setErrorMessage('')
    } catch (err) {
      console.error('Copy failed:', err)
      setErrorMessage('Unable to copy text to clipboard.')
      setStatusMessage('')
    }
  }

  const handleDownloadText = () => {
    if (!ocrText.trim()) return

    const blob = new Blob([ocrText], { type: 'text/plain;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'fileforge-ocr.txt'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(link.href)
    setStatusMessage('Download started.')
    setErrorMessage('')
  }

  return (
    <main className="flex-1">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-white mb-4">OCR Text Extractor</h1>
        <p className="text-slate-300 mb-8">
          Extract text from images and PDF documents using advanced optical character recognition.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Section */}
          <div className="lg:col-span-1">
            <div className="rounded-3xl border border-slate-700 bg-slate-800/60 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Upload File</h2>
              <div className="border-2 border-dashed border-slate-600 rounded-2xl p-8 text-center hover:border-cyan-500 transition-colors cursor-pointer">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-input"
                />
                <label htmlFor="file-input" className="cursor-pointer">
                  <div className="text-4xl mb-2">📄</div>
                  <p className="text-slate-300 text-sm">
                    {selectedFile ? selectedFile.name : 'Click to select image or PDF'}
                  </p>
                  <p className="text-slate-500 text-xs mt-2">PNG, JPG, PDF</p>
                </label>
              </div>
              {selectedFile && (
                <p className="text-cyan-400 text-xs mt-3">✓ File selected</p>
              )}
            </div>
          </div>

          {/* Settings Section */}
          <div className="lg:col-span-1">
            <div className="rounded-3xl border border-slate-700 bg-slate-800/60 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">OCR Options</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                  >
                    <option value="eng">English</option>
                    <option value="fra">French</option>
                    <option value="deu">German</option>
                    <option value="spa">Spanish</option>
                    <option value="ita">Italian</option>
                    <option value="por">Portuguese</option>
                    <option value="rus">Russian</option>
                    <option value="jpn">Japanese</option>
                    <option value="chi_sim">Chinese (Simplified)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Action Section */}
          <div className="lg:col-span-1">
            <div className="rounded-3xl border border-slate-700 bg-slate-800/60 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Action</h2>
              <button
                onClick={handleExtract}
                disabled={!selectedFile || processing}
                className="w-full bg-linear-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:scale-100 mb-4"
              >
                {processing ? 'Extracting...' : 'Extract Text'}
              </button>
              <p className="text-slate-400 text-xs text-center">
                Your files are processed in your browser. No data is uploaded to servers.
              </p>
            </div>
          </div>
        </div>

        {/* Result Panel */}
        <div className="mt-8 rounded-3xl border border-slate-700 bg-slate-800/60 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Extracted Text</h2>

          <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-6">
            <div className="rounded-3xl border border-slate-700 bg-slate-900/50 p-6 flex flex-col items-center justify-center min-h-[60]">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Selected OCR preview"
                  className="max-w-full rounded-2xl shadow-[0_0_60px_rgba(6,182,212,0.15)]"
                />
              ) : (
                <div className="text-center text-slate-500">
                  <div className="text-5xl mb-4">🖼️</div>
                  <p className="text-slate-400">Selected image preview will appear here.</p>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-slate-700 bg-slate-900/50 p-6">
              <textarea
                readOnly
                value={ocrText}
                placeholder="Extracted text will appear here..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-300 text-sm focus:outline-none h-48 resize-none"
              />
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={handleCopyText}
                  disabled={!ocrText.trim()}
                  className="w-full sm:w-auto bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-700 text-slate-900 font-semibold py-3 px-5 rounded-xl transition-all duration-300 disabled:cursor-not-allowed"
                >
                  Copy Text
                </button>
                <button
                  type="button"
                  onClick={handleDownloadText}
                  disabled={!ocrText.trim()}
                  className="w-full sm:w-auto bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700 text-white font-semibold py-3 px-5 rounded-xl transition-all duration-300 disabled:cursor-not-allowed"
                >
                  Download TXT
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 text-center">
            {statusMessage && <p className="text-slate-300 text-sm">{statusMessage}</p>}
            {errorMessage && <p className="text-rose-400 text-sm">{errorMessage}</p>}
          </div>
        </div>
      </div>
    </main>
  )
}
