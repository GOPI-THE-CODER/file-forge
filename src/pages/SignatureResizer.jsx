import { useState } from 'react'

export default function SignatureResizer() {
  const [imageFile, setImageFile] = useState(null)
  const [originalPreview, setOriginalPreview] = useState(null)
  const [signaturePreview, setSignaturePreview] = useState(null)
  const [enhanceSignature, setEnhanceSignature] = useState(true)

  const [sizePreset, setSizePreset] =
    useState('300x80')

  const handleImageSelect = (e) => {
    const file = e.target.files[0]

    if (!file) return

    setImageFile(file)

    setOriginalPreview(
      URL.createObjectURL(file)
    )

    setSignaturePreview(null)
  }

  const generateSignature = () => {
    if (!imageFile) {
      alert('Please select a signature image.')
      return
    }
    let targetWidth = 300
let targetHeight = 80

if (sizePreset === '140x60') {
  targetWidth = 140
  targetHeight = 60
}

if (sizePreset === '560x240') {
  targetWidth = 560
  targetHeight = 240
}

    const img = new Image()

    img.onload = () => {
    
      const canvas =
        document.createElement('canvas')

      canvas.width = targetWidth
      canvas.height = targetHeight

      const ctx =
        canvas.getContext('2d')
        ctx.imageSmoothingEnabled = true
ctx.imageSmoothingQuality = 'high'

      // White Background
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(
        0,
        0,
        targetWidth,
        targetHeight
      )

      // Fit entire signature
      // Auto Crop Signature

const tempCanvas =
  document.createElement('canvas')

tempCanvas.width = img.width
tempCanvas.height = img.height

const tempCtx =
  tempCanvas.getContext('2d')

tempCtx.drawImage(img, 0, 0)

const imageData =
  tempCtx.getImageData(
    0,
    0,
    tempCanvas.width,
    tempCanvas.height
  )

const data = imageData.data

let top = tempCanvas.height
let left = tempCanvas.width
let right = 0
let bottom = 0

for (let y = 0; y < tempCanvas.height; y++) {

  for (let x = 0; x < tempCanvas.width; x++) {

    const index =
      (y * tempCanvas.width + x) * 4

    const r = data[index]
    const g = data[index + 1]
    const b = data[index + 2]

    const brightness =
0.299 * r +
0.587 * g +
0.114 * b

if (brightness < 250) {

      top = Math.min(top, y)
      left = Math.min(left, x)
      right = Math.max(right, x)
      bottom = Math.max(bottom, y)

    }
  }
}
const padding = 10

left = Math.max(
  0,
  left - padding
)

top = Math.max(
  0,
  top - padding
)

right = Math.min(
  tempCanvas.width,
  right + padding
)

bottom = Math.min(
  tempCanvas.height,
  bottom + padding
)

const cropWidth =
  right - left

const cropHeight =
  bottom - top
const ratio = Math.min(
  targetWidth / cropWidth,
  targetHeight / cropHeight
)

const width =
  cropWidth * ratio

const height =
  cropHeight * ratio

const x =
  (targetWidth - width) / 2

const y =
  (targetHeight - height) / 2

ctx.drawImage(
  tempCanvas,
  left,
  top,
  cropWidth,
  cropHeight,
  x,
  y,
  width,
  height
)
    if (enhanceSignature) {
  try {
    const imageData = ctx.getImageData(
      0,
      0,
      canvas.width,
      canvas.height
    )

    const data = imageData.data

    for (let i = 0; i < data.length; i += 4) {
      const brightness =
        (data[i] + data[i + 1] + data[i + 2]) / 3

      if (brightness > 245) {
        data[i] = 255
        data[i + 1] = 255
        data[i + 2] = 255
     } else {
  data[i] = Math.max(0, data[i] - 40)
  data[i + 1] = Math.max(0, data[i + 1] - 40)
  data[i + 2] = Math.max(0, data[i + 2] - 40)
}

    ctx.putImageData(imageData, 0, 0)
  }} catch (error) {
    console.error(error)
  }
  }

const output =
        canvas.toDataURL(
          'image/png'
        )

      setSignaturePreview(output)
    }

    img.src =
      URL.createObjectURL(imageFile)
  }

  const downloadSignature = () => {
    if (!signaturePreview) return

    const link =
      document.createElement('a')

    link.href = signaturePreview

    link.download =
      'signature.png'

    document.body.appendChild(link)

    link.click()

    document.body.removeChild(link)
  }

  return (
    <main className="flex-1">
      <div className="max-w-7xl mx-auto px-4 py-12">

        <div className="mb-10">
          <h1 className="text-4xl font-bold text-white mb-4">
            Signature Resizer
          </h1>

          <p className="text-slate-300">
            Resize signatures for forms and applications.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">

          {/* Original */}

          <div className="bg-slate-800 rounded-xl border border-slate-700 p-8">

            <h2 className="text-xl font-semibold text-white mb-6">
              Original Signature
            </h2>

            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="block w-full text-slate-300 mb-6"
            />

            <label className="block text-slate-300 mb-2">
              Size Preset
            </label>

            <select
              value={sizePreset}
              onChange={(e) =>
                setSizePreset(e.target.value)
              }
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white mb-6"
            >
              <option value="140x60">
                140 × 60 px
              </option>

              <option value="300x80">
                300 × 80 px
              </option>
              
              <option value="560x240">
                560 × 240 px
              </option>
            </select>
<div className="mb-6">
  <label className="flex items-center gap-2 text-slate-300">
    <input
      type="checkbox"
      checked={enhanceSignature}
      onChange={(e) =>
        setEnhanceSignature(
          e.target.checked
        )
      }
    />
    Enhance Signature
  </label>
</div>
            {originalPreview ? (
              <img
                src={originalPreview}
                alt="Original"
                className="w-full rounded-lg"
              />
            ) : (
              <div className="text-center text-slate-500 py-20">
                No signature selected
              </div>
            )}

            <button
              onClick={generateSignature}
              className="w-full mt-6 px-6 py-3 rounded-lg font-semibold text-white bg-linear-to-r from-blue-500 to-purple-600"
            >
              Generate Signature
            </button>

          </div>

          {/* Preview */}

          <div className="bg-slate-800 rounded-xl border border-slate-700 p-8">

            <h2 className="text-xl font-semibold text-white mb-6">
              Signature Preview
            </h2>

            {signaturePreview ? (
              <>
                <div className="bg-white rounded-lg p-4 flex justify-center">

                  <img
                    src={signaturePreview}
                    alt="Signature"
                    className="border"
                  />

                </div>
                <p className="text-slate-300 text-center mt-3">
  Output Size: {sizePreset.replace('x', ' × ')} px
</p>

                <button
                  onClick={downloadSignature}
                  className="w-full mt-6 px-6 py-3 rounded-lg font-semibold text-white bg-linear-to-r from-blue-500 to-purple-600"
                >
                  Download Signature
                </button>
              </>
            ) : (
              <div className="text-center text-slate-500 py-20">
                Signature preview will appear here
              </div>
            )}

          </div>

        </div>

      </div>
    </main>
    )
  }