import { useState } from 'react'
import { jsPDF } from 'jspdf'

export default function ImageToPDF() {
  const [imageFiles, setImageFiles] = useState([])
  const [previewUrls, setPreviewUrls] = useState([])
  const [pdfName, setPdfName] = useState('fileforge')
  const [pdfBlob, setPdfBlob] = useState(null)
  const [pdfSize, setPdfSize] = useState(null)

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files)

    if (!files.length) return

    setImageFiles(files)

    const urls = files.map((file) =>
      URL.createObjectURL(file)
    )

    setPreviewUrls(urls)
    setPdfBlob(null)
    setPdfSize(null)
  }

  const convertToPDF = async () => {
    if (!imageFiles.length) {
      alert('Please select images first.')
      return
    }

    const pdf = new jsPDF()

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i]

      const imageData = await new Promise((resolve) => {
        const img = new Image()

        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height

          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0)

          const compressedImage = canvas.toDataURL(
            'image/jpeg',
            0.85
          )

          resolve({
            img,
            compressedImage,
          })
        }

        img.src = URL.createObjectURL(file)
      })

      if (i > 0) {
        pdf.addPage()
      }

      const pdfWidth =
        pdf.internal.pageSize.getWidth()

      const pdfHeight =
        pdf.internal.pageSize.getHeight()

      const ratio = Math.min(
        pdfWidth / imageData.img.width,
        pdfHeight / imageData.img.height
      )

      const width =
        imageData.img.width * ratio

      const height =
        imageData.img.height * ratio

      const x = (pdfWidth - width) / 2
      const y = (pdfHeight - height) / 2

      pdf.addImage(
        imageData.compressedImage,
        'JPEG',
        x,
        y,
        width,
        height
      )
    }

    const blob = pdf.output('blob')

    setPdfBlob(blob)
    setPdfSize(
      (blob.size / 1024).toFixed(2)
    )
  }

  const downloadPDF = () => {
    if (!pdfBlob) return

    const url = URL.createObjectURL(pdfBlob)

    const link = document.createElement('a')

    link.href = url
    link.download = `${pdfName}.pdf`

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)
  }

  return (
    <main className="flex-1">
      <div className="max-w-6xl mx-auto px-4 py-12">

        <div className="mb-10">
          <h1 className="text-4xl font-bold text-white mb-4">
            Image to PDF
          </h1>

          <p className="text-slate-300">
            Convert multiple images into a single PDF.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">

          <div className="bg-slate-800 rounded-xl border border-slate-700 p-8">

            <h2 className="text-xl font-semibold text-white mb-6">
              Upload Images
            </h2>

            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              className="block w-full text-slate-300"
            />

            <div className="mt-6">
              <label className="block text-slate-300 mb-2">
                PDF File Name
              </label>

              <input
                type="text"
                value={pdfName}
                onChange={(e) =>
                  setPdfName(e.target.value)
                }
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white"
              />
            </div>

            <button
              onClick={convertToPDF}
              className="w-full mt-6 px-6 py-3 rounded-lg font-semibold text-white bg-linear-to-r from-blue-500 to-purple-600"
            >
              Generate PDF
            </button>

            {pdfBlob && (
              <div className="mt-6">

                <p className="text-green-400">
                  PDF Ready
                </p>

                <p className="text-slate-300 mt-2">
                  Size: {pdfSize} KB
                </p>

                <button
                  onClick={downloadPDF}
                  className="w-full mt-4 px-6 py-3 rounded-lg font-semibold text-white bg-linear-to-r from-blue-500 to-purple-600"
                >
                  Download PDF
                </button>

              </div>
            )}

          </div>

          <div className="bg-slate-800 rounded-xl border border-slate-700 p-8">

            <h2 className="text-xl font-semibold text-white mb-6">
              Preview
            </h2>

            {previewUrls.length > 0 ? (
              <div className="space-y-4">
                {previewUrls.map((url, index) => (
                  <img
                    key={index}
                    src={url}
                    alt={`Preview ${index + 1}`}
                    className="w-full rounded-lg"
                  />
                ))}
              </div>
            ) : (
              <div className="text-center text-slate-500 py-20">
                No images selected
              </div>
            )}

          </div>

        </div>

      </div>
    </main>
  )
}
