import { useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import { Link } from 'react-router-dom'

export default function PdfMerger() {
  const [files, setFiles] = useState([])
  const [merging, setMerging] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState(null)
  const [downloadName, setDownloadName] = useState('merged.pdf')

  function handleAddFiles(evt) {
    const incoming = Array.from(evt.target.files || [])
    const mapped = incoming.map((f, i) => ({
      id: `${Date.now()}-${i}`,
      file: f,
      name: f.name,
      size: f.size
    }))
    setFiles((s) => [...s, ...mapped])
    evt.target.value = null
  }

  function removeFile(id) {
    setFiles((s) => s.filter((f) => f.id !== id))
  }

  function moveUp(idx) {
    if (idx === 0) return
    setFiles((s) => {
      const copy = [...s]
      const t = copy[idx - 1]
      copy[idx - 1] = copy[idx]
      copy[idx] = t
      return copy
    })
  }

  function moveDown(idx) {
    setFiles((s) => {
      if (idx === s.length - 1) return s
      const copy = [...s]
      const t = copy[idx + 1]
      copy[idx + 1] = copy[idx]
      copy[idx] = t
      return copy
    })
  }

  async function mergePdfs() {
    if (files.length === 0) return
    setMerging(true)
    try {
      const mergedPdf = await PDFDocument.create()
      for (const item of files) {
        const arrayBuffer = await item.file.arrayBuffer()
        const src = await PDFDocument.load(arrayBuffer)
        const copied = await mergedPdf.copyPages(src, src.getPageIndices())
        copied.forEach((p) => mergedPdf.addPage(p))
      }
      const bytes = await mergedPdf.save()
      const blob = new Blob([bytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      setDownloadUrl(url)
      setDownloadName(`fileforge-merged-${Date.now()}.pdf`)
    } catch (err) {
      console.error('Merge failed', err)
      alert('Failed to merge PDFs. See console for details.')
    } finally {
      setMerging(false)
    }
  }

  return (
    <main className="flex-1">
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">PDF Merger</h1>
              <p className="text-sm text-slate-400">Upload, reorder, and merge multiple PDFs in your browser.</p>
            </div>
            <div className="hidden sm:block">
              <Link to="/documents" className="text-sm text-slate-400 hover:text-white">Back to Documents</Link>
            </div>
          </div>

          <label className="flex items-center gap-3 mb-4">
            <input
              type="file"
              accept="application/pdf"
              multiple
              onChange={handleAddFiles}
              className="hidden"
              id="pdf-upload-input"
            />
            <label htmlFor="pdf-upload-input" className="inline-flex items-center px-4 py-2 rounded-md bg-linear-to-r from-blue-500 to-purple-600 text-white cursor-pointer text-sm">
              Select PDFs
            </label>
            <span className="text-xs text-slate-400 ml-3">You can add multiple PDF files and reorder them.</span>
          </label>

          <div className="space-y-3">
            {files.length === 0 && (
              <div className="p-4 rounded-lg border border-slate-700 bg-slate-800/30 text-slate-400">No files added yet</div>
            )}

            {files.map((f, idx) => (
              <div key={f.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-700 bg-slate-800/40">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md bg-slate-700 flex items-center justify-center text-sm">PDF</div>
                  <div>
                    <div className="text-sm font-medium text-white">{f.name}</div>
                    <div className="text-xs text-slate-400">{(f.size / 1024).toFixed(1)} KB</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => moveUp(idx)} className="px-2 py-1 rounded bg-slate-700 text-slate-200 text-xs">↑</button>
                  <button onClick={() => moveDown(idx)} className="px-2 py-1 rounded bg-slate-700 text-slate-200 text-xs">↓</button>
                  <button onClick={() => removeFile(f.id)} className="px-2 py-1 rounded bg-red-600 text-white text-xs">Remove</button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button onClick={mergePdfs} disabled={merging || files.length === 0} className="inline-flex items-center px-4 py-2 rounded-md bg-linear-to-r from-blue-500 to-purple-600 text-white disabled:opacity-50">
              {merging ? 'Merging…' : 'Merge PDFs'}
            </button>

            {downloadUrl && (
              <a href={downloadUrl} download={downloadName} className="inline-flex items-center px-4 py-2 rounded-md border border-slate-600 text-sm text-white bg-slate-800/40">Download Merged PDF</a>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
