import { Link } from 'react-router-dom'

export default function Utilities() {
  const tools = [
    {
      name: 'Image Compressor',
      path: '/image-compressor',
      description: 'Compress images to an exact KB size'
    },
    {
      name: 'Image Resizer',
      path: '/image-resizer',
      description: 'Resize images by width and height'
    },
    {
      name: 'Image Converter',
      path: '/image-converter',
      description: 'Convert PNG, JPG and WEBP images'
    },
    {
  name: 'Image to PDF',
  path: '/image-to-pdf',
  description: 'Convert images into PDF documents'
},
{
  name: 'Passport Photo Maker',
  path: '/passport-photo-maker',
  description: 'Create passport-size photos'
},
{
  name: 'Signature Resizer',
  path: '/signature-resizer',
  description: 'Resize signatures for forms and applications'
}
  ]

  return (
    <main className="flex-1">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        <div className="mb-10">
          <h1 className="text-4xl font-bold text-white mb-4">
            Utilities
          </h1>

          <p className="text-slate-300">
            Powerful image and document tools for everyday use.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => (
            <Link
              key={tool.path}
              to={tool.path}
              className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-purple-500 hover:scale-105 transition-all duration-300"
            >
              <h2 className="text-xl font-semibold text-white mb-3">
                {tool.name}
              </h2>

              <p className="text-slate-400">
                {tool.description}
              </p>
            </Link>
          ))}
        </div>

      </div>
    </main>
  )
}