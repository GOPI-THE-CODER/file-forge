import { useState } from 'react'
import imageCompression from 'browser-image-compression'

export default function ImageCompressor() {
  const [selectedImage, setSelectedImage] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)

  const [targetKB, setTargetKB] = useState(100)

  const [compressedFile, setCompressedFile] = useState(null)
  const [compressedPreview, setCompressedPreview] = useState(null)
  const [compressedSize, setCompressedSize] = useState(null)
  const [savedKB, setSavedKB] = useState(null)
const [reductionPercent, setReductionPercent] = useState(null)
const [accuracyPercent, setAccuracyPercent] = useState(null)
const [originalResolution, setOriginalResolution] = useState('')
const [compressedResolution, setCompressedResolution] = useState('')

  const handleImageSelect = (e) => {
    const file = e.target.files[0]

    if (!file) return

    setSelectedImage(file)
    setPreviewUrl(URL.createObjectURL(file))
    const img = new Image()

img.onload = () => {
  setOriginalResolution(
    `${img.width} × ${img.height}`
  )
}

img.src = URL.createObjectURL(file)

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
    let minQuality = 0.01
    let maxQuality = 1.0

    let bestCompressed = null
    let bestDifference = Infinity

    for (let i = 0; i < 25; i++) {
      const quality = (minQuality + maxQuality) / 2

      const options = {
        maxSizeMB: 20,
        initialQuality: quality,
        maxWidthOrHeight: 4000,
        useWebWorker: true,
      }

      const compressed = await imageCompression(
        selectedImage,
        options
      )

      const sizeKB = compressed.size / 1024
      const difference = Math.abs(
        sizeKB - Number(targetKB)
      )

      if (difference < bestDifference) {
        bestDifference = difference
        bestCompressed = compressed
      }

      if (sizeKB > Number(targetKB)) {
        maxQuality = quality
      } else {
        minQuality = quality
      }

      if (difference <= 1) {
        break
      }
    }

    setCompressedFile(bestCompressed)

    setCompressedPreview(
      URL.createObjectURL(bestCompressed)
    )

    setCompressedSize(
      (bestCompressed.size / 1024).toFixed(2)
    )
    const compressedImg = new Image()

compressedImg.onload = () => {
  setCompressedResolution(
    `${compressedImg.width} × ${compressedImg.height}`
  )
}

compressedImg.src =
  URL.createObjectURL(bestCompressed)
    const originalKB = selectedImage.size / 1024
const finalKB = bestCompressed.size / 1024

setSavedKB(
  (originalKB - finalKB).toFixed(2)
)

setReductionPercent(
  (
    ((originalKB - finalKB) / originalKB) * 100
  ).toFixed(2)
)

setAccuracyPercent(
  (
    (1 - Math.abs(finalKB - targetKB) /
    Number(targetKB)) * 100
  ).toFixed(2)
)

    alert(
      `Target: ${targetKB} KB\nResult: ${(bestCompressed.size / 1024).toFixed(2)} KB`
    )

  } catch (error) {
    console.error(error)
    alert('Compression failed.')
  }
}

  const downloadCompressedImage = () => {
    if (!compressedFile) return

    const link = document.createElement('a')

    link.href = URL.createObjectURL(compressedFile)
    link.download = `compressed-${compressedFile.name}`

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <main className="flex-1">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        <div className="mb-10">
          <h1 className="text-4xl font-bold bg-linear-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent mb-4">
            Exact KB Image Compressor
          </h1>

          <p className="text-slate-300">
            Compress images to a target size in KB.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">

          <div className="space-y-6">

            <div className="bg-slate-800 rounded-xl border border-slate-700 p-8">

              <h2 className="text-xl font-semibold text-white mb-6">
                Upload Image
              </h2>

              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="block w-full text-slate-300"
              />

              {selectedImage && (
                <div className="mt-4 text-slate-300">
                  <p>{selectedImage.name}</p>
                  <p>
                    {(selectedImage.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              )}
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
                onChange={(e) =>
                  setTargetKB(e.target.value)
                }
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white"
              />

              <button
                onClick={compressImage}
                className="w-full mt-6 px-6 py-3 rounded-lg font-semibold text-white bg-linear-to-r from-blue-500 to-purple-600"
              >
                Compress Image
              </button>
            </div>

          </div>

          <div className="space-y-6">

            <div className="bg-slate-800 rounded-xl border border-slate-700 p-8">

              <h2 className="text-xl font-semibold text-white mb-6">
                Original Image
              </h2>

              {previewUrl ? (
  <>
    <img
      src={previewUrl}
      alt="Original"
      className="w-full rounded-lg"
    />

    <p className="mt-2 text-slate-400 text-sm">
      Resolution: {originalResolution}
    </p>
  </>
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
                <>
                  <img
                    src={compressedPreview}
                    alt="Compressed"
                    className="w-full rounded-lg"
                  />

                  <p className="mt-4 text-green-400">
                    Final Size: {compressedSize} KB
                    </p>
                  <p className="text-cyan-400">
  Saved: {savedKB} KB
</p>

<p className="text-purple-400">
  Reduction: {reductionPercent}%
</p>

<p className="text-yellow-400">
  Accuracy: {accuracyPercent}%
</p>
                </>
              ) : (
                <div className="text-center text-slate-500 py-16">
                  Compressed image preview will appear here
                </div>
              )}

              <button
                onClick={downloadCompressedImage}
                disabled={!compressedFile}
                className="w-full mt-6 px-6 py-3 rounded-lg font-semibold text-white bg-linear-to-r from-blue-500 to-purple-600 disabled:opacity-50"
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