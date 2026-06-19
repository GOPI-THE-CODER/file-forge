import { useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

export default function FileMetadataViewer() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [metadata, setMetadata] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedFile(file)
      setMetadata(null)
    }
  }

  const getImageMetadata = (file) => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const reader = new FileReader()

      reader.onload = (e) => {
        img.onload = () => {
          const dpi = 96 // Standard screen DPI
          const width = img.naturalWidth
          const height = img.naturalHeight
          const aspectRatio = (width / height).toFixed(2)

          resolve({
            width,
            height,
            resolution: `${width}x${height} px`,
            aspectRatio: `${aspectRatio}:1`,
            dpi
          })
        }

        img.onerror = () => {
          reject(new Error('Failed to load image'))
        }

        img.src = e.target.result
      }

      reader.onerror = () => {
        reject(new Error('Failed to read file'))
      }

      reader.readAsDataURL(file)
    })
  }

  const getPDFMetadata = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = async (e) => {
        try {
          const pdf = await pdfjsLib.getDocument(e.target.result).promise
          resolve({
            pageCount: pdf.numPages
          })
        } catch (error) {
          reject(new Error('Failed to read PDF'))
        }
      }

      reader.onerror = () => {
        reject(new Error('Failed to read file'))
      }

      reader.readAsArrayBuffer(file)
    })
  }

  const handleAnalyze = async () => {
    if (!selectedFile) {
      alert('Please select a file first')
      return
    }

    setAnalyzing(true)

    try {
      // Get basic metadata for all files
      const fileName = selectedFile.name
      const fileExtension = fileName.split('.').pop().toLowerCase()
      const fileType = selectedFile.type || 'Unknown'
      const fileSize = selectedFile.size
      const lastModified = new Date(selectedFile.lastModified).toLocaleString()
      const fileSizeKB = (fileSize / 1024).toFixed(2)
      const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2)

      let baseMetadata = {
        'File Name': fileName,
        'File Extension': `.${fileExtension}`,
        'File Type': fileType || 'Unknown',
        'File Size': `${fileSizeKB} KB (${fileSizeMB} MB)`,
        'Last Modified': lastModified
      }

      // Get additional metadata based on file type
      let additionalMetadata = {}

      if (selectedFile.type.startsWith('image/')) {
        try {
          const imageData = await getImageMetadata(selectedFile)
          additionalMetadata = {
            'Image Width': `${imageData.width}px`,
            'Image Height': `${imageData.height}px`,
            'Resolution': imageData.resolution,
            'Aspect Ratio': imageData.aspectRatio,
            'DPI': `${imageData.dpi} DPI`
          }
        } catch (error) {
          additionalMetadata = {
            'Error': 'Could not extract image metadata'
          }
        }
      } else if (fileExtension === 'pdf') {
        try {
          const pdfData = await getPDFMetadata(selectedFile)
          additionalMetadata = {
            'Page Count': pdfData.pageCount
          }
        } catch (error) {
          additionalMetadata = {
            'Page Count': 'Unable to extract page count'
          }
        }
      }

      setMetadata({
        ...baseMetadata,
        ...additionalMetadata
      })
    } catch (error) {
      alert('Error analyzing file: ' + error.message)
      setMetadata(null)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleCopyMetadata = () => {
    if (!metadata) return

    const metadataText = Object.entries(metadata)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n')

    navigator.clipboard.writeText(metadataText).then(() => {
      alert('Metadata copied to clipboard!')
    }).catch(() => {
      alert('Failed to copy metadata')
    })
  }

  const handleDownloadMetadata = () => {
    if (!metadata) return

    const metadataText = Object.entries(metadata)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n')

    const element = document.createElement('a')
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(metadataText))
    element.setAttribute('download', `metadata_${selectedFile.name.split('.')[0]}.txt`)
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  return (
    <main className="flex-1">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-white mb-4">File Metadata Viewer</h1>
        <p className="text-slate-300 mb-8">
          Inspect and view detailed metadata from images, documents, and other files.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Section */}
          <div className="lg:col-span-1">
            <div className="rounded-3xl border border-slate-700 bg-slate-800/60 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Select File</h2>
              <div className="border-2 border-dashed border-slate-600 rounded-2xl p-8 text-center hover:border-cyan-500 transition-colors cursor-pointer">
                <input
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-input"
                />
                <label htmlFor="file-input" className="cursor-pointer">
                  <div className="text-4xl mb-2">🧾</div>
                  <p className="text-slate-300 text-sm">
                    {selectedFile ? selectedFile.name : 'Click to select any file'}
                  </p>
                  <p className="text-slate-500 text-xs mt-2">All file types supported</p>
                </label>
              </div>
              {selectedFile && (
                <div className="mt-4 p-3 bg-slate-700/50 rounded-lg">
                  <p className="text-green-400 text-xs font-semibold">✓ File selected</p>
                  <p className="text-slate-400 text-xs mt-1">Size: {(selectedFile.size / 1024).toFixed(2)} KB</p>
                </div>
              )}
            </div>
          </div>

          {/* Info Section */}
          <div className="lg:col-span-1">
            <div className="rounded-3xl border border-slate-700 bg-slate-800/60 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">File Info</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Type:</span>
                  <span className="text-slate-200">{selectedFile?.type || 'Not selected'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Size:</span>
                  <span className="text-slate-200">{selectedFile ? (selectedFile.size / 1024).toFixed(2) + ' KB' : '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Modified:</span>
                  <span className="text-slate-200">{selectedFile ? new Date(selectedFile.lastModified).toLocaleDateString() : '-'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Section */}
          <div className="lg:col-span-1">
            <div className="rounded-3xl border border-slate-700 bg-slate-800/60 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Action</h2>
              <button
                onClick={handleAnalyze}
                disabled={!selectedFile || analyzing}
                className="w-full bg-linear-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:scale-100 mb-4"
              >
                {analyzing ? 'Analyzing...' : 'Analyze Metadata'}
              </button>
              <p className="text-slate-400 text-xs text-center">
                Analysis is performed locally in your browser.
              </p>
            </div>
          </div>
        </div>

        {/* Result Panel */}
        <div className="mt-8 rounded-3xl border border-slate-700 bg-slate-800/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Metadata Details</h2>
            {metadata && (
              <div className="flex gap-2">
                <button
                  onClick={handleCopyMetadata}
                  className="px-4 py-2 bg-linear-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white text-sm font-semibold rounded-lg transition-all duration-300 transform hover:scale-105"
                >
                  📋 Copy
                </button>
                <button
                  onClick={handleDownloadMetadata}
                  className="px-4 py-2 bg-linear-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-sm font-semibold rounded-lg transition-all duration-300 transform hover:scale-105"
                >
                  ⬇️ Download TXT
                </button>
              </div>
            )}
          </div>
          <div className="bg-slate-900/50 rounded-2xl p-6 space-y-3 max-h-96 overflow-y-auto">
            {metadata ? (
              <div className="space-y-4">
                {Object.entries(metadata).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-start border-b border-slate-700 pb-3 last:border-b-0">
                    <span className="text-slate-400 font-semibold text-sm">{key}:</span>
                    <span className="text-slate-200 text-sm text-right ml-4 wrap-break-words">{value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-slate-400 text-sm">
                <p className="mb-4">Select a file and click "Analyze Metadata" to view details:</p>
                <ul className="space-y-2 text-xs text-slate-500">
                  <li>• File name, extension, type, and size</li>
                  <li>• Last modified date</li>
                  <li>• Image dimensions and aspect ratio (for images)</li>
                  <li>• Page count (for PDFs)</li>
                  <li>• Copy or download metadata as text</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
