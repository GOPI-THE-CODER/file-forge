import { useState } from 'react'
import imageCompression from 'browser-image-compression'

export default function Utilities() {
  const [targetKB, setTargetKB] = useState(100)
  const [selectedImage, setSelectedImage] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)

  const [compressedFile, setCompressedFile] = useState(null)
  const [compressedPreview, setCompressedPreview] = useState(null)
  const [compressedSize, setCompressedSize] = useState(null)

  const handleImageSelect = (e) => {
    const file = e.target.files[0]

    if (!file) return

    setSelectedImage(file)
    setPreviewUrl(URL.createObjectURL(file))

    setCompressedFile(null)
    setCompressedPreview(null)
    setCompressedSize(null)
  }

  const compressImage = async () => {
    if (!selectedImage) {
      alert('Please select an image first.')
      return
    }

    try {
      const options = {
        maxSizeMB: targetKB / 1024,
        maxWidthOrHeight: 4000,
        useWebWorker: true,
      }

      const compressed = await imageCompression(
        selectedImage,
        options
      )

      setCompressedFile(compressed)
      setCompressedPreview(URL.createObjectURL(compressed))
      setCompressedSize((compressed.size / 1024).toFixed(2))
    } catch (error) {
      console.error(error)
      alert('Compression failed.')
    }
  }

  const downloadCompressedImage = () => {
    if (!compressedFile) return

    const link = document.createElement('a')
    link.href = compressedPreview
    link.download = `compressed-${selectedImage.name}`
    link.click()
  }

  return (
    <main className="flex-1">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        <div className="mb-10">
          <h1 className="text-4xl font-bold bg-linear-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent mb-4">
            Exact KB Image Compressor
          </h1>

          <p className="text-slate-300 max-w-3xl">
            Compress images to a target size while maintaining the best possible quality.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">

          {/* LEFT */}
          <div className="space-y-6">

            <div className="bg-slate-800 rounded-xl border border-slate-700 p-8">

              <h2 className="text-xl font-semibold text-white mb-6">
                Upload Image
              </h2>

              <div className="border-2 border-dashed border-slate-600 rounded-xl p-10 text-center">

                <div className="text-5xl mb-4">
                  📸
                </div>

                <p className="text-slate-300 mb-2">
                  Drag & Drop or Select an Image
                </p>

                <p className="text-slate-500 text-sm mb-6">
                  Supports JPG, JPEG, PNG
                </p>

                <label className="inline-block px-6 py-3 rounded-lg font-semibold text-white bg-linear-to-r from-blue-500 to-purple-600 hover:opacity-90 transition cursor-pointer">

                  Browse Image

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />

                </label>

              </div>
            </div>

            <div className="bg-slate-800 rounded-xl border border-slate-700 p-8">

              <h2 className="text-xl font-semibold text-white mb-6">
                Compression Settings
              </h2>

              <label className="block text-slate-300 mb-3">
                Target Size (KB)
              </label>

              <input
                type="number"
                min="1"
                value={targetKB}
                onChange={(e) => setTargetKB(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white"
              />

              <button
                onClick={compressImage}
                className="w-full mt-6 px-6 py-3 rounded-lg font-semibold text-white bg-linear-to-r from-blue-500 to-purple-600 hover:opacity-90 transition"
              >
                Compress Image
              </button>

            </div>

          </div>

          {/* RIGHT */}
          <div className="space-y-6">

            <div className="bg-slate-800 rounded-xl border border-slate-700 p-8">

              <h2 className="text-xl font-semibold text-white mb-6">
                Original Image
              </h2>

              {previewUrl ? (
                <div>

                  <img
                    src={previewUrl}
                    alt="Original"
                    className="w-full max-h-80 object-contain rounded-lg"
                  />

                  <div className="mt-4 text-slate-300 text-sm space-y-1">

                    <p>
                      <strong>Name:</strong> {selectedImage.name}
                    </p>

                    <p>
                      <strong>Size:</strong>{' '}
                      {(selectedImage.size / 1024).toFixed(2)} KB
                    </p>

                  </div>

                </div>
              ) : (
                <div className="text-center text-slate-500 py-16">
                  No image selected
                </div>
              )}

            </div>

            <div className="bg-slate-800 rounded-xl border border-slate-700 p-8">

              <h2 className="text-xl font-semibold text-white mb-6">
                Compressed Result
              </h2>

              {compressedPreview ? (
                <div>

                  <img
                    src={compressedPreview}
                    alt="Compressed"
                    className="w-full max-h-80 object-contain rounded-lg"
                  />

                  <div className="mt-4 text-slate-300 text-sm">

                    <p>
                      <strong>Compressed Size:</strong> {compressedSize} KB
                    </p>

                  </div>

                </div>
              ) : (
                <div className="text-center text-slate-500 py-16">
                  Compressed image preview will appear here
                </div>
              )}

              <button
                onClick={downloadCompressedImage}
                disabled={!compressedFile}
                className={`w-full mt-6 px-6 py-3 rounded-lg font-semibold ${
                  compressedFile
                    ? 'text-white bg-linear-to-r from-blue-500 to-purple-600'
                    : 'text-slate-400 bg-slate-700 cursor-not-allowed'
                }`}
              >
                Download Image
              </button>

            </div>

          </div>

        </div>

      </div>
    </main>
  )
}