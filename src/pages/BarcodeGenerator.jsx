import { useState } from 'react'

export default function BarcodeGenerator() {
  const [barcodeData, setBarcodeData] = useState('')
  const [barcodeType, setBarcodeType] = useState('code128')
  const [height, setHeight] = useState(100)
  const [generating, setGenerating] = useState(false)

  const handleGenerate = () => {
    if (!barcodeData.trim()) {
      alert('Please enter data for barcode')
      return
    }
    setGenerating(true)
    // TODO: Implement actual barcode generation logic
    setTimeout(() => setGenerating(false), 1000)
  }

  return (
    <main className="flex-1">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-white mb-4">Barcode Generator</h1>
        <p className="text-slate-300 mb-8">
          Generate various barcode formats for inventory, shipping, and product labeling.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Section */}
          <div className="lg:col-span-1">
            <div className="rounded-3xl border border-slate-700 bg-slate-800/60 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Input Data</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-2">
                    Barcode Data
                  </label>
                  <input
                    type="text"
                    value={barcodeData}
                    onChange={(e) => setBarcodeData(e.target.value)}
                    placeholder="Enter product code or SKU"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Settings Section */}
          <div className="lg:col-span-1">
            <div className="rounded-3xl border border-slate-700 bg-slate-800/60 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Barcode Options</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Format</label>
                  <select
                    value={barcodeType}
                    onChange={(e) => setBarcodeType(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                  >
                    <option value="code128">Code 128</option>
                    <option value="code39">Code 39</option>
                    <option value="ean13">EAN-13</option>
                    <option value="ean8">EAN-8</option>
                    <option value="upc">UPC</option>
                  </select>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm text-slate-300">Height</label>
                    <span className="text-sm text-cyan-400 font-semibold">{height}px</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="300"
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
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
                onClick={handleGenerate}
                disabled={!barcodeData.trim() || generating}
                className="w-full bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:scale-100 mb-4"
              >
                {generating ? 'Generating...' : 'Generate Barcode'}
              </button>
              <p className="text-slate-400 text-xs text-center">
                Your barcode is generated in your browser.
              </p>
            </div>
          </div>
        </div>

        {/* Result Panel */}
        <div className="mt-8 rounded-3xl border border-slate-700 bg-slate-800/60 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Generated Barcode</h2>
          <div className="bg-slate-900/50 rounded-2xl p-8 flex flex-col items-center justify-center min-h-80">
            <div className="text-center">
              <div className="text-4xl mb-4">🏷️</div>
              <p className="text-slate-400">
                Your barcode will appear here. Download as PNG or SVG.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
