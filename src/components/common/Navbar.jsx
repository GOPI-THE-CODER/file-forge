import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)

  const linkClass = "px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:text-white hover:bg-slate-800 transition"
  const mobileLinkClass = "block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-slate-700 transition"

  return (
    <nav className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <div className="text-2xl font-bold bg-linear-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
              FileForge
            </div>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-1">
            <Link
              to="/documents"
              className={linkClass}
            >
              Documents
            </Link>
            <Link
              to="/utilities"
              className={linkClass}
            >
              Utilities
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
            >
              Docs
            </a>
          </div>

          {/* CTA Button */}
          <div className="hidden md:flex items-center">
            <button className="px-4 py-2 rounded-lg bg-linear-to-r from-blue-500 to-purple-600 text-white text-sm font-medium hover:shadow-lg hover:shadow-purple-500/50 transition">
              Get Started
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-md text-gray-400 hover:text-white hover:bg-slate-800 transition"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={isOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-slate-800/95 backdrop-blur border-t border-slate-700">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              to="/documents"
              className={mobileLinkClass}
              onClick={() => setIsOpen(false)}
            >
              Documents
            </Link>
            <Link
              to="/utilities"
              className={mobileLinkClass}
              onClick={() => setIsOpen(false)}
            >
              Utilities
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className={mobileLinkClass}
            >
              Docs
            </a>
            <button className="w-full mt-2 px-4 py-2 rounded-lg bg-linear-to-r from-blue-500 to-purple-600 text-white text-sm font-medium">
              Get Started
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
