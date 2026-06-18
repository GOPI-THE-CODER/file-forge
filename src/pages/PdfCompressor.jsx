import { useState } from 'react'

export default function PdfCompressor() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [quality, setQuality] = useState(50)
  const [processing, setProcessing] = useState(false)

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file)
    } else {
      alert('Please select a PDF file')
    }
  }

  const handleCompress = () => {
    if (!selectedFile) {
      alert('Please select a PDF file first')
      return
    }
    setProcessing(true)
    // TODO: Implement actual PDF compression logic
    setTimeout(() => setProcessing(false), 2000)
  }

  return (
    <main className="flex-1">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-white mb-4">PDF Compressor</h1>
        <p className="text-slate-300 mb-8">
          Reduce PDF file size while maintaining quality for efficient storage and sharing.
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
                  <p className="text-slate-500 text-xs mt-2">Max 100MB</p>
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
              <h2 className="text-xl font-semibold text-white mb-4">Compression Level</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm text-slate-300">Quality</label>
                    <span className="text-sm text-cyan-400 font-semibold">{quality}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    {quality > 75 ? 'High quality, larger file' : quality > 50 ? 'Balanced' : 'Small file, lower quality'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Section */}
          <div className="lg:col-span-1">
            <div className="rounded-3xl border border-slate-700 bg-slate-800/60 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Action</h2>
              <button
                onClick={handleCompress}
                disabled={!selectedFile || processing}
                className="w-full bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:scale-100 mb-4"
              >
                {processing ? 'Compressing...' : 'Compress PDF'}
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
            <p className="text-slate-400">
              Compression results will appear here. Compare original and compressed file sizes.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
