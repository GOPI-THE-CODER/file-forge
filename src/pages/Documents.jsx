export default function Documents() {
  return (
    <main className="flex-1">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent mb-6">
          Documents
        </h1>
        <div className="prose prose-invert max-w-none">
          <p className="text-gray-300 mb-4">
            FileForge Document Management - Process, organize, and manage your files with ease.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-3">Upload Files</h2>
              <p className="text-gray-400">Securely upload and store your documents in the cloud.</p>
            </div>
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-3">Organize</h2>
              <p className="text-gray-400">Create folders, tags, and collections for better organization.</p>
            </div>
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-3">Search</h2>
              <p className="text-gray-400">Powerful full-text search to find documents instantly.</p>
            </div>
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-3">Collaborate</h2>
              <p className="text-gray-400">Share and collaborate with team members in real-time.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
