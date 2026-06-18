import { useState } from 'react'

export default function FileMetadataViewer() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleAnalyze = () => {
    if (!selectedFile) {
      alert('Please select a file first')
      return
    }
    setAnalyzing(true)
    // TODO: Implement actual metadata extraction logic
    setTimeout(() => setAnalyzing(false), 1500)
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
          <h2 className="text-xl font-semibold text-white mb-4">Metadata Details</h2>
          <div className="bg-slate-900/50 rounded-2xl p-6 space-y-3 max-h-96 overflow-y-auto">
            <div className="text-slate-400 text-sm">
              <p className="mb-4">Detailed metadata information will appear here:</p>
              <ul className="space-y-2 text-xs text-slate-500">
                <li>• File creation date</li>
                <li>• Image dimensions (for images)</li>
                <li>• Color space and DPI</li>
                <li>• Camera information (EXIF data)</li>
                <li>• Document properties</li>
                <li>• Encoding and compression details</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
