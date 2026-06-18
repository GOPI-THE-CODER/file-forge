import { useState } from 'react'

export default function OcrTextExtractor() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [language, setLanguage] = useState('eng')
  const [processing, setProcessing] = useState(false)

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      setSelectedFile(file)
    } else {
      alert('Please select an image or PDF file')
    }
  }

  const handleExtract = () => {
    if (!selectedFile) {
      alert('Please select a file first')
      return
    }
    setProcessing(true)
    // TODO: Implement actual OCR logic
    setTimeout(() => setProcessing(false), 2000)
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
          <div className="bg-slate-900/50 rounded-2xl p-6">
            <textarea
              readOnly
              placeholder="Extracted text will appear here..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-300 text-sm focus:outline-none h-48 resize-none"
            />
            <p className="text-slate-400 text-xs mt-3">
              Copy or download the extracted text.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
