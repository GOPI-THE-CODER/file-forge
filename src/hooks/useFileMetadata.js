import { useCallback, useState } from 'react'

import { analyzeFile } from '../utils/metadata/parsers'
import { formatBytes, formatDate, formatValue } from '../utils/metadata/formatters'

export function useFileMetadata() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [metadata, setMetadata] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')

  const handleFileSelect = useCallback((event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setSelectedFile(file)
    setMetadata(null)
    setError('')
  }, [])

  const handleAnalyze = useCallback(async () => {
    if (!selectedFile) {
      setError('Please select a file first.')
      return
    }

    setAnalyzing(true)
    setMetadata(null)
    setError('')

    try {
      setMetadata(await analyzeFile(selectedFile))
    } catch (caught) {
      console.error('Metadata analysis failed:', caught)
      setError(caught?.message || 'Unable to analyze this file.')
    } finally {
      setAnalyzing(false)
    }
  }, [selectedFile])

  const serializeMetadata = useCallback(() => {
    if (!metadata) return ''

    return Object.entries(metadata)
      .map(([key, value]) => `${key}: ${formatValue(value)}`)
      .join('\n')
  }, [metadata])

  const handleCopyMetadata = useCallback(async () => {
    if (!metadata) return

    try {
      await navigator.clipboard.writeText(serializeMetadata())
      alert('Metadata copied to clipboard!')
    } catch {
      alert('Failed to copy metadata.')
    }
  }, [metadata, serializeMetadata])

  const handleDownloadMetadata = useCallback(() => {
    if (!metadata || !selectedFile) return

    const blob = new Blob([serializeMetadata()], {
      type: 'text/plain;charset=utf-8'
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `fileforge-metadata-${selectedFile.name}.txt`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }, [metadata, selectedFile, serializeMetadata])

  return {
    selectedFile,
    metadata,
    analyzing,
    error,
    handleFileSelect,
    handleAnalyze,
    handleCopyMetadata,
    handleDownloadMetadata,
    formatBytes,
    formatDate
  }
}
