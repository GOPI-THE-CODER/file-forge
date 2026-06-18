import { HashRouter, Routes, Route } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import Home from './pages/Home'
import Documents from './pages/Documents'
import Utilities from './pages/Utilities'
import ImageCompressor from './pages/ImageCompressor'
import ImageResizer from './pages/ImageResizer'
import ImageConverter from './pages/ImageConverter'
import ImageToPDF from './pages/ImageToPDF'
import PassportPhotoMaker from './pages/PassportPhotoMaker'
import SignatureResizer from './pages/SignatureResizer'
import PdfMerger from './pages/PdfMerger'
import PdfSplitter from './pages/PdfSplitter'
import PdfCompressor from './pages/PdfCompressor'
import PdfToImage from './pages/PdfToImage'
import QrGenerator from './pages/QrGenerator'
import BarcodeGenerator from './pages/BarcodeGenerator'
import OcrTextExtractor from './pages/OcrTextExtractor'
import FileMetadataViewer from './pages/FileMetadataViewer'

export default function App() {
  return (
    <HashRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Home />} />
<Route path="/documents" element={<Documents />} />
<Route path="/utilities" element={<Utilities />} />
<Route
  path="/image-compressor"
  element={<ImageCompressor />}
/>
<Route path="/image-resizer" element={<ImageResizer />} />
<Route path="/image-converter" element={<ImageConverter />} />
<Route
  path="/image-to-pdf"
  element={<ImageToPDF />}
/>
<Route
  path="/passport-photo-maker"
  element={<PassportPhotoMaker />}
/>
<Route
  path="/signature-resizer"
  element={<SignatureResizer />}
/>
          <Route path="/pdf-merger" element={<PdfMerger />} />
          <Route path="/pdf-splitter" element={<PdfSplitter />} />
          <Route path="/pdf-compressor" element={<PdfCompressor />} />
          <Route path="/pdf-to-image" element={<PdfToImage />} />
          <Route path="/qr-generator" element={<QrGenerator />} />
          <Route path="/barcode-generator" element={<BarcodeGenerator />} />
          <Route path="/ocr-text-extractor" element={<OcrTextExtractor />} />
          <Route path="/file-metadata-viewer" element={<FileMetadataViewer />} />
        </Routes>
      </MainLayout>
    </HashRouter>
  )
}