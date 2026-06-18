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
        </Routes>
      </MainLayout>
    </HashRouter>
  )
}