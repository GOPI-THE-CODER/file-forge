import { useState } from 'react'
import QRCode from 'qrcode'

export default function QrGenerator() {
  const [qrData, setQrData] = useState('')
  const [qrSize, setQrSize] = useState(300)
  const [errorCorrection, setErrorCorrection] = useState('M')
  const [generating, setGenerating] = useState(false)
  const [previewSrc, setPreviewSrc] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [messageType, setMessageType] = useState('') // 'success' or 'error'

  const handleGenerate = async () => {
    const trimmedData = qrData.trim()

    if (!trimmedData) {
      setErrorMessage('Please enter text or URL to generate a QR code.')
      setMessageType('error')
      setPreviewSrc('')
      setStatusMessage('')
      return
    }

    if (trimmedData.length > 2953) {
      setErrorMessage('Input is too long. Maximum length is 2953 characters.')
      setMessageType('error')
      setPreviewSrc('')
      return
    }

    setGenerating(true)
    setErrorMessage('')
    setStatusMessage('')
    setMessageType('')
    setPreviewSrc('')

    try {
      const dataUrl = await QRCode.toDataURL(trimmedData, {
        errorCorrectionLevel: errorCorrection,
        width: qrSize,
        margin: 1,
        type: 'image/png',
      })

      setPreviewSrc(dataUrl)
      setStatusMessage('✓ QR code generated successfully!')
      setMessageType('success')
    } catch (error) {
      console.error('QR generation failed:', error)
      setErrorMessage('Unable to generate the QR code. Try a shorter value or a different error correction level.')
      setMessageType('error')
      setStatusMessage('')
    } finally {
      setGenerating(false)
    }
  }

  const handleDownload = async () => {
    if (!previewSrc) {
      setErrorMessage('Generate a QR code first before downloading.')
      setMessageType('error')
      return
    }

    try {
      const link = document.createElement('a')
      link.href = previewSrc
      link.download = `fileforge-qr-${Date.now()}.png`
      document.body.appendChild(link)
      link.click()
      link.remove()
      setStatusMessage('✓ QR code downloaded successfully!')
      setMessageType('success')
      setErrorMessage('')
    } catch (error) {
      console.error('Download failed:', error)
      setErrorMessage('Failed to download QR code.')
      setMessageType('error')
    }
  }

  const handleCopyImage = async () => {
    if (!previewSrc) {
      setErrorMessage('Generate a QR code first before copying.')
      setMessageType('error')
      return
    }

    try {
      const response = await fetch(previewSrc)
      const blob = await response.blob()
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob,
        }),
      ])
      setStatusMessage('✓ QR code copied to clipboard!')
      setMessageType('success')
      setErrorMessage('')
    } catch (error) {
      console.error('Copy failed:', error)
      setErrorMessage('Failed to copy QR code. Your browser may not support this feature.')
      setMessageType('error')
    }
  }

  const handleClear = () => {
    setQrData('')
    setPreviewSrc('')
    setStatusMessage('')
    setErrorMessage('')
    setMessageType('')
    setQrSize(300)
    setErrorCorrection('M')
  }

  return (
    <main className="flex-1">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-white mb-4">QR Generator</h1>
        <p className="text-slate-300 mb-8">
          Create QR codes for URLs, text messages, contact information, and more.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Section */}
          <div className="lg:col-span-1">
            <div className="rounded-3xl border border-slate-700 bg-slate-800/60 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Input Data</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-2">
                    Enter URL or Text
                  </label>
                  <textarea
                    value={qrData}
                    onChange={(e) => setQrData(e.target.value)}
                    placeholder="https://example.com or any text"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500 h-24 resize-none"
                  />
                  <p className="text-xs text-slate-400 mt-2">
                    {qrData.length}/2953 characters
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Settings Section */}
          <div className="lg:col-span-1">
            <div className="rounded-3xl border border-slate-700 bg-slate-800/60 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">QR Options</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm text-slate-300">Size</label>
                    <span className="text-sm text-cyan-400 font-semibold">{qrSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="500"
                    value={qrSize}
                    onChange={(e) => setQrSize(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Error Correction</label>
                  <select
                    value={errorCorrection}
                    onChange={(e) => setErrorCorrection(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                  >
                    <option value="L">Low (7%)</option>
                    <option value="M">Medium (15%)</option>
                    <option value="Q">Quartile (25%)</option>
                    <option value="H">High (30%)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Action Section */}
          <div className="lg:col-span-1">
            <div className="rounded-3xl border border-slate-700 bg-slate-800/60 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Action</h2>
              <div className="space-y-3">
                <button
                  onClick={handleGenerate}
                  disabled={!qrData.trim() || generating}
                  className="w-full bg-linear-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:scale-100"
                >
                  {generating ? '⏳ Generating...' : '✨ Generate QR'}
                </button>
                <button
                  onClick={handleClear}
                  className="w-full bg-linear-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-105"
                >
                  🔄 Clear
                </button>
              </div>
              <p className="text-slate-400 text-xs text-center mt-3">
                Your data is processed securely in your browser.
              </p>
            </div>
          </div>
        </div>

        {/* Result Panel */}
        <div className="mt-8 rounded-3xl border border-slate-700 bg-slate-800/60 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Generated QR Code</h2>
          <div className="bg-slate-900/50 rounded-2xl p-8 flex flex-col items-center justify-center min-h-80">
            {previewSrc ? (
              <img
                src={previewSrc}
                alt="Generated QR code"
                width={qrSize}
                height={qrSize}
                className="max-w-full rounded-2xl shadow-[0_0_60px_rgba(6,182,212,0.25)]"
              />
            ) : (
              <div className="text-center">
                <div className="text-4xl mb-4">🔳</div>
                <p className="text-slate-400">
                  Your QR code will appear here.
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {previewSrc && (
            <div className="mt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <button
                  onClick={handleDownload}
                  className="bg-linear-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 text-sm"
                >
                  ⬇️ Download PNG
                </button>
                <button
                  onClick={handleCopyImage}
                  className="bg-linear-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 text-sm"
                >
                  📋 Copy Image
                </button>
              </div>
            </div>
          )}

          {/* Status Messages */}
          <div className="mt-6">
            {statusMessage && (
              <div className="p-4 bg-green-900/30 border border-green-700/50 rounded-lg">
                <p className="text-green-400 text-sm font-semibold">{statusMessage}</p>
              </div>
            )}
            {errorMessage && (
              <div className="p-4 bg-rose-900/30 border border-rose-700/50 rounded-lg">
                <p className="text-rose-400 text-sm font-semibold">{errorMessage}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
