import { useState } from 'react'

export default function PassportPhotoMaker() {
  const [imageFile, setImageFile] = useState(null)
  const [originalPreview, setOriginalPreview] = useState(null)

  const [passportPreview, setPassportPreview] =
    useState(null)

  const handleImageSelect = (e) => {
    const file = e.target.files[0]

    if (!file) return

    setImageFile(file)

    setOriginalPreview(
      URL.createObjectURL(file)
    )

    setPassportPreview(null)
  }

  const generatePassportPhoto = () => {
    if (!imageFile) {
      alert('Please select an image first.')
      return
    }

    const img = new Image()

    img.onload = () => {
      const canvas =
        document.createElement('canvas')

      const PASSPORT_WIDTH = 413
      const PASSPORT_HEIGHT = 531

      canvas.width = PASSPORT_WIDTH
      canvas.height = PASSPORT_HEIGHT

      const ctx =
        canvas.getContext('2d')

      // White Background
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(
        0,
        0,
        PASSPORT_WIDTH,
        PASSPORT_HEIGHT
      )

      // Fit entire image
      const ratio = Math.min(
        PASSPORT_WIDTH / img.width,
        PASSPORT_HEIGHT / img.height
      )

      const width =
        img.width * ratio

      const height =
        img.height * ratio

      const x =
        (PASSPORT_WIDTH - width) / 2

      const y =
        (PASSPORT_HEIGHT - height) / 2

      ctx.drawImage(
        img,
        x,
        y,
        width,
        height
      )

      const output =
        canvas.toDataURL(
          image/jpeg
        )

      setPassportPreview(output)
    }

    img.src =
      URL.createObjectURL(imageFile)
  }

  const downloadPassportPhoto = () => {
    if (!passportPreview) return

    const link =
      document.createElement('a')

    link.href = passportPreview

    link.download =
      'passport-photo.jpg'

    document.body.appendChild(link)

    link.click()

    document.body.removeChild(link)
  }

  return (
    <main className="flex-1">
      <div className="max-w-7xl mx-auto px-4 py-12">

        <div className="mb-10">
          <h1 className="text-4xl font-bold text-white mb-4">
            Passport Photo Maker
          </h1>

          <p className="text-slate-300">
            Create 35 × 45 mm passport photos.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">

          {/* Left Side */}

          <div className="bg-slate-800 rounded-xl border border-slate-700 p-8">

            <h2 className="text-xl font-semibold text-white mb-6">
              Original Photo
            </h2>

            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="block w-full text-slate-300 mb-6"
            />

            {originalPreview ? (
              <img
                src={originalPreview}
                alt="Original"
                className="w-full rounded-lg"
              />
            ) : (
              <div className="text-center text-slate-500 py-20">
                No image selected
              </div>
            )}

            <button
              onClick={
                generatePassportPhoto
              }
              className="w-full mt-6 px-6 py-3 rounded-lg font-semibold text-white bg-linear-to-r from-blue-500 to-purple-600"
            >
              Generate Passport Photo
            </button>

          </div>

          {/* Right Side */}

          <div className="bg-slate-800 rounded-xl border border-slate-700 p-8">

            <h2 className="text-xl font-semibold text-white mb-6">
              Passport Preview
            </h2>

            {passportPreview ? (
              <>
                <div className="bg-white rounded-lg p-4 flex justify-center">

                  <img
                    src={passportPreview}
                    alt="Passport"
                    className="border"
                  />

                </div>

                <button
                  onClick={
                    downloadPassportPhoto
                  }
                  className="w-full mt-6 px-6 py-3 rounded-lg font-semibold text-white bg-linear-to-r from-blue-500 to-purple-600"
                >
                  Download Passport Photo
                </button>
              </>
            ) : (
              <div className="text-center text-slate-500 py-20">
                Passport photo preview will appear here
              </div>
            )}

          </div>

        </div>

      </div>
    </main>
  )
}