import { useState } from 'react'

export default function PdfToImage() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [format, setFormat] = useState('png')
  const [dpi, setDpi] = useState(150)
  const [processing, setProcessing] = useState(false)

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file)
    } else {
      alert('Please select a PDF file')
    }
  }

  const handleConvert = () => {
    if (!selectedFile) {
      alert('Please select a PDF file first')
      return
    }
    setProcessing(true)
    // TODO: Implement actual PDF to image conversion logic
    setTimeout(() => setProcessing(false), 2000)
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
                <p className="text-cyan-400 text-xs mt-3">✓ File selected</p>
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
                className="w-full bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:scale-100 mb-4"
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
          <div className="bg-slate-900/50 rounded-2xl p-8 text-center">
            <p className="text-slate-400">
              Converted images will appear here. Download individual images or as a ZIP archive.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
