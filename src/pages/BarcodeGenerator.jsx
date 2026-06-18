import { useEffect, useRef, useState } from 'react'
import JsBarcode from 'jsbarcode'

export default function BarcodeGenerator() {
  const [barcodeData, setBarcodeData] = useState('')
  const [height, setHeight] = useState(100)
  const [generating, setGenerating] = useState(false)
  const [pngUrl, setPngUrl] = useState('')
  const [statusMessage, setStatusMessage] = useState('Enter text to generate your barcode.')
  const [errorMessage, setErrorMessage] = useState('')
  const canvasRef = useRef(null)

  const renderBarcode = () => {
    const trimmedData = barcodeData.trim()
    if (!trimmedData) {
      setPngUrl('')
      setStatusMessage('Enter text to generate your barcode.')
      setErrorMessage('')
      return
    }

    try {
      const canvas = canvasRef.current
      if (!canvas) return

      JsBarcode(canvas, trimmedData, {
        format: 'CODE128',
        lineColor: '#06b6d4',
        background: '#0f172a',
        height,
        width: 2,
        displayValue: true,
        fontOptions: 'bold',
        textAlign: 'center',
        textMargin: 5,
        font: 'Arial',
        margin: 12,
      })

      const url = canvas.toDataURL('image/png')
      setPngUrl(url)
      setStatusMessage('Live preview updated.')
      setErrorMessage('')
    } catch (error) {
      console.error('Barcode render failed:', error)
      setPngUrl('')
      setStatusMessage('')
      setErrorMessage('Unable to generate barcode from this value.')
    }
  }

  useEffect(() => {
    renderBarcode()
  }, [barcodeData, height])

  const handleGenerate = () => {
    if (!barcodeData.trim()) {
      setErrorMessage('Please enter barcode text.')
      setStatusMessage('')
      return
    }

    setGenerating(true)
    renderBarcode()
    setGenerating(false)
    setStatusMessage('Barcode generated successfully.')
  }

  const handleDownload = () => {
    if (!pngUrl) {
      setErrorMessage('Generate a barcode before downloading.')
      return
    }

    const link = document.createElement('a')
    link.href = pngUrl
    link.download = 'fileforge-barcode.png'
    document.body.appendChild(link)
    link.click()
    link.remove()
    setStatusMessage('PNG download started.')
  }

  return (
    <main className="flex-1">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-white mb-4">Barcode Generator</h1>
        <p className="text-slate-300 mb-8">
          Generate CODE128 barcodes for inventory, shipping, and product labeling.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Section */}
          <div className="lg:col-span-1">
            <div className="rounded-3xl border border-slate-700 bg-slate-800/60 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Input Data</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-2">
                    Barcode Text
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
                  <div className="w-full rounded-lg bg-slate-700 border border-slate-600 px-3 py-3 text-sm text-slate-200">
                    CODE128
                  </div>
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
                className="w-full bg-linear-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:scale-100 mb-4"
              >
                {generating ? 'Generating...' : 'Generate Barcode'}
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={!pngUrl}
                className="w-full bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-3 rounded-lg transition-all duration-300"
              >
                Download PNG
              </button>
              <p className="text-slate-400 text-xs text-center mt-4">
                Your barcode is generated locally in the browser.
              </p>
            </div>
          </div>
        </div>

        {/* Result Panel */}
        <div className="mt-8 rounded-3xl border border-slate-700 bg-slate-800/60 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Generated Barcode</h2>
          <div className="bg-slate-900/50 rounded-2xl p-8 flex flex-col items-center justify-center min-h-80">
            {pngUrl ? (
              <img
                src={pngUrl}
                alt="Generated barcode"
                className="max-w-full rounded-2xl shadow-[0_0_60px_rgba(6,182,212,0.25)]"
              />
            ) : (
              <div className="text-center">
                <div className="text-4xl mb-4">🏷️</div>
                <p className="text-slate-400">
                  Enter text to generate a live barcode preview.
                </p>
              </div>
            )}
          </div>
          <div className="mt-4 text-center">
            {statusMessage && <p className="text-slate-300 text-sm">{statusMessage}</p>}
            {errorMessage && <p className="text-rose-400 text-sm">{errorMessage}</p>}
          </div>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </main>
  )
}
