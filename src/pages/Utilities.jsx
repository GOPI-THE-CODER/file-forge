export default function Utilities() {
  return (
    <main className="flex-1">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold bg-linear-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent mb-6">
          Utilities
        </h1>
        <div className="prose prose-invert max-w-none">
          <p className="text-gray-300 mb-4">
            Powerful utilities to enhance your file management and productivity.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-3">Image Compression</h2>
              <p className="text-gray-400">Reduce file sizes without losing quality.</p>
            </div>
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-3">Format Conversion</h2>
              <p className="text-gray-400">Convert between different file formats seamlessly.</p>
            </div>
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-3">Batch Processing</h2>
              <p className="text-gray-400">Process multiple files at once efficiently.</p>
            </div>
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-3">Metadata Editor</h2>
              <p className="text-gray-400">View and edit file metadata and properties.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
