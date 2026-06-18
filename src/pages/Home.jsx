import { Link } from 'react-router-dom'
import heroImg from '../assets/hero.png'

export default function Home() {
  const tools = [
    {
      title: 'Document Management',
      description: 'Upload, organize, and search documents with intelligent tagging and categorization',
      icon: '📄',
      link: '/documents',
      features: ['Upload Files', 'Organize', 'Search', 'Collaborate']
    },
    {
      title: 'Utility Tools',
      description: 'Transform your files with powerful utilities for compression, conversion, and editing',
      icon: '⚙️',
      link: '/utilities',
      features: ['Image Compression', 'Format Conversion', 'Batch Processing', 'Metadata Editor']
    }
  ]

  const toolPages = [
    { name: 'Image Compressor', path: '/image-compressor', description: 'Compress images to an exact KB size', icon: '🖼️' },
    { name: 'Image Resizer', path: '/image-resizer', description: 'Resize images by width and height', icon: '📐' },
    { name: 'Image Converter', path: '/image-converter', description: 'Convert PNG, JPG and WEBP images', icon: '🔄' },
    { name: 'Image to PDF', path: '/image-to-pdf', description: 'Convert images into PDF documents', icon: '📝' },
    { name: 'Passport Photo Maker', path: '/passport-photo-maker', description: 'Create passport-size photos', icon: '🪪' },
    { name: 'Signature Resizer', path: '/signature-resizer', description: 'Resize signatures for forms and applications', icon: '✍️' },
    { name: 'PDF Merger', path: '/pdf-merger', description: 'Combine multiple PDFs into one document', icon: '📎' },
    { name: 'PDF Splitter', path: '/pdf-splitter', description: 'Split PDF files into individual pages', icon: '✂️' },
    { name: 'PDF Compressor', path: '/pdf-compressor', description: 'Reduce PDF file size without losing quality', icon: '🗜️' },
    { name: 'PDF to Image', path: '/pdf-to-image', description: 'Export PDF pages as PNG or JPG images', icon: '🖨️' },
    { name: 'QR Generator', path: '/qr-generator', description: 'Generate QR codes for URLs and text', icon: '🔳' },
    { name: 'Barcode Generator', path: '/barcode-generator', description: 'Create barcode images for inventory and labels', icon: '🏷️' },
    { name: 'OCR Text Extractor', path: '/ocr-text-extractor', description: 'Extract text from images and PDFs', icon: '📄' },
    { name: 'File Metadata Viewer', path: '/file-metadata-viewer', description: 'Inspect file metadata quickly and easily', icon: '🧾' }
  ]

  const benefits = [
    {
      title: 'Lightning Fast',
      description: 'Optimized performance with instant file processing and seamless user experience',
      icon: '⚡'
    },
    {
      title: 'Secure & Private',
      description: 'End-to-end encryption and privacy-first approach to keep your data safe',
      icon: '🔒'
    },
    {
      title: 'Fully Responsive',
      description: 'Works flawlessly on desktop, tablet, and mobile devices',
      icon: '📱'
    },
    {
      title: 'Easy Integration',
      description: 'Simple API and straightforward workflow for seamless integration',
      icon: '🔗'
    }
  ]

  return (
    <main className="flex-1">
      {/* Hero Section */}
      <section className="relative py-16 px-4 sm:px-6 lg:px-8 border-b border-slate-700">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Hero Content */}
            <div className="space-y-6">
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
                  <span className="bg-linear-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                    FileForge
                  </span>
                  {' '}Your Ultimate File Companion
                </h1>
                <p className="text-base md:text-lg text-slate-300 leading-relaxed">
                  Transform, organize, and manage your files with cutting-edge tools designed for modern workflows.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  to="/documents"
                  className="inline-flex items-center justify-center px-6 py-2 rounded-lg font-semibold text-white bg-linear-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
                >
                  Get Started
                </Link>
                <a
                  href="#tools"
                  className="inline-flex items-center justify-center px-6 py-2 rounded-lg font-semibold text-white border border-slate-600 hover:border-slate-500 hover:bg-slate-800 transition-all duration-200"
                >
                  Learn More
                </a>
              </div>

              <div className="flex gap-6 pt-2">
                <div>
                  <div className="text-lg font-bold text-white">10M+</div>
                  <div className="text-xs text-slate-400">Files Processed</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-white">99.9%</div>
                  <div className="text-xs text-slate-400">Uptime</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-white">24/7</div>
                  <div className="text-xs text-slate-400">Support</div>
                </div>
              </div>
            </div>

            {/* Hero Image */}
            <div className="hidden md:flex justify-center">
  <div className="w-80 h-80 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
    <span className="text-6xl">🚀</span>
       </div>
     </div></div></div>
     </section>

      {/* Tools Showcase Section */}
      <section id="tools" className="py-14 px-4 sm:px-6 lg:px-8 border-b border-slate-700">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
              Powerful Tools at Your Fingertips
            </h2>
            <p className="text-sm md:text-base text-slate-400">
              Explore our comprehensive suite of file management and utility tools.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {toolPages.map((tool) => (
              <Link
                key={tool.path}
                to={tool.path}
                className="group p-6 rounded-3xl border border-slate-700 bg-slate-800/60 hover:bg-slate-700/80 hover:border-cyan-500 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl">{tool.icon}</span>
                  <span className="text-slate-500 group-hover:text-cyan-300 transition-colors">→</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{tool.name}</h3>
                <p className="text-sm text-slate-400 mb-5">{tool.description}</p>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500 font-medium">
                  Open tool
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 border-b border-slate-700">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
              Why Choose FileForge?
            </h2>
            <p className="text-sm md:text-base text-slate-400">
              Built for professionals who demand excellence
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="p-5 rounded-lg border border-slate-700 bg-slate-800/30 hover:bg-slate-800/50 transition-all duration-200"
              >
                <div className="text-2xl mb-3">{benefit.icon}</div>
                <h3 className="text-base font-bold text-white mb-1">{benefit.title}</h3>
                <p className="text-slate-400 text-xs leading-relaxed">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="relative p-8 rounded-2xl border border-slate-600 bg-linear-to-br from-slate-800/50 to-slate-900/50 text-center">
            <div className="absolute inset-0 bg-linear-to-r from-blue-500/10 to-purple-600/10 rounded-2xl blur-xl"></div>
            <div className="relative">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                Ready to Transform Your Workflow?
              </h2>
              <p className="text-sm md:text-base text-slate-300 mb-6 max-w-2xl mx-auto">
                Join thousands of professionals already using FileForge to streamline their file management process.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to="/documents"
                  className="inline-flex items-center justify-center px-6 py-2 rounded-lg font-semibold text-white bg-linear-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
                >
                  Start Free Trial
                </Link>
                <a
                  href="#tools"
                  className="inline-flex items-center justify-center px-6 py-2 rounded-lg font-semibold text-white border border-slate-600 hover:border-slate-500 hover:bg-slate-700 transition-all duration-200"
                >
                  View All Features
                </a>
              </div>
              <p className="text-xs text-slate-400 mt-4">
                No credit card required. Start managing files smarter today.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
