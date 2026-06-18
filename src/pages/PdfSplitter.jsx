import { useState } from 'react'
import { PDFDocument } from 'pdf-lib'

export default function PdfSplitter() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [splitMode, setSplitMode] = useState('all')
  const [pageRange, setPageRange] = useState('')
  const [processing, setProcessing] = useState(false)
  const [pageCount, setPageCount] = useState(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    setErrorMessage('')
    setStatusMessage('')
    setPageCount(null)
    if (file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
      setSelectedFile(file)
      try {
        const arrayBuffer = await file.arrayBuffer()
        const loadedDoc = await PDFDocument.load(arrayBuffer)
        setPageCount(loadedDoc.getPageCount())
      } catch (error) {
        console.error(error)
        setSelectedFile(null)
        setErrorMessage('Unable to read PDF. Please select a valid PDF file.')
      }
    } else {
      setSelectedFile(null)
      setErrorMessage('Please select a valid PDF file.')
    }
  }

  const parsePageRange = (range, maxPages) => {
    const normalized = range.trim()
    if (!normalized) {
      throw new Error('Please enter a page range like 1-5.')
    }

    const segments = normalized.split(',').map((segment) => segment.trim())
    const pages = new Set()

    for (const segment of segments) {
      if (!segment) continue
      const rangeMatch = /^([0-9]+)(?:-([0-9]+))?$/.exec(segment)
      if (!rangeMatch) {
        throw new Error(`Invalid range segment: ${segment}`)
      }

      const start = Number(rangeMatch[1])
      const end = rangeMatch[2] ? Number(rangeMatch[2]) : start

      if (Number.isNaN(start) || Number.isNaN(end)) {
        throw new Error(`Invalid range values: ${segment}`)
      }
      if (start < 1 || end < 1 || start > end || end > maxPages) {
        throw new Error(`Range must be between 1 and ${maxPages}: ${segment}`)
      }

      for (let page = start; page <= end; page += 1) {
        pages.add(page - 1)
      }
    }

    if (pages.size === 0) {
      throw new Error('No pages selected. Please enter a valid page range.')
    }

    return Array.from(pages).sort((a, b) => a - b)
  }

  const createSplitPdf = async (sourceBytes, selectedPageIndices) => {
    const originalPdf = await PDFDocument.load(sourceBytes)
    const newPdf = await PDFDocument.create()
    const copiedPages = await newPdf.copyPages(originalPdf, selectedPageIndices)

    for (const page of copiedPages) {
      newPdf.addPage(page)
    }

    return await newPdf.save()
  }

  const downloadBlob = (bytes, filename) => {
    const blob = new Blob([bytes], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const handleSplit = async () => {
    setErrorMessage('')
    setStatusMessage('')

    if (!selectedFile) {
      setErrorMessage('Please select a PDF file first.')
      return
    }
    if (!pageCount) {
      setErrorMessage('Unable to determine page count. Please re-upload the PDF.')
      return
    }
    if (splitMode === 'every') {
      setErrorMessage('Every N Pages mode is not supported yet. Please use Split All Pages or Custom Range.')
      return
    }

    let pageIndices = []
    if (splitMode === 'all') {
      pageIndices = Array.from({ length: pageCount }, (_, index) => index)
    } else if (splitMode === 'range') {
      try {
        pageIndices = parsePageRange(pageRange, pageCount)
      } catch (error) {
        setErrorMessage(error.message)
        return
      }
    }

    setProcessing(true)

    try {
      const arrayBuffer = await selectedFile.arrayBuffer()
      const splitBytes = await createSplitPdf(arrayBuffer, pageIndices)
      const sanitizedFileName = selectedFile.name.replace(/\.pdf$/i, '')
      const outputFileName = `${sanitizedFileName}_split.pdf`
      downloadBlob(splitBytes, outputFileName)
      setStatusMessage(`Created PDF with ${pageIndices.length} page${pageIndices.length === 1 ? '' : 's'} and started download.`)
    } catch (error) {
      console.error(error)
      setErrorMessage('Failed to split the PDF. Please try a different file or range.')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <main className="flex-1">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-white mb-4">PDF Splitter</h1>
        <p className="text-slate-300 mb-8">
          Split PDF documents into separate pages or extract specific page ranges.
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
              <h2 className="text-xl font-semibold text-white mb-4">Split Options</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Mode</label>
                  <select
                    value={splitMode}
                    onChange={(e) => setSplitMode(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                  >
                    <option value="all">Split All Pages</option>
                    <option value="range">Custom Range</option>
                    <option value="every">Every N Pages</option>
                  </select>
                </div>
                {splitMode === 'range' && (
                  <div>
                    <label className="block text-sm text-slate-300 mb-2">
                      Page Range (e.g., 1-5, 10-15)
                    </label>
                    <input
                      type="text"
                      placeholder="1-5"
                      value={pageRange}
                      onChange={(e) => setPageRange(e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Section */}
          <div className="lg:col-span-1">
            <div className="rounded-3xl border border-slate-700 bg-slate-800/60 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Action</h2>
              <button
                onClick={handleSplit}
                disabled={!selectedFile || processing}
                className="w-full bg-linear-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:scale-100 mb-4"
              >
                {processing ? 'Processing...' : 'Split PDF'}
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
          <div className="bg-slate-900/50 rounded-2xl p-8 text-center">
            {errorMessage ? (
              <p className="text-rose-400">{errorMessage}</p>
            ) : statusMessage ? (
              <p className="text-cyan-400">{statusMessage}</p>
            ) : (
              <p className="text-slate-400">
                Split results will appear here. Download your split PDF automatically once ready.
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
