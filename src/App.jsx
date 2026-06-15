import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import Home from './pages/Home'
import Documents from './pages/Documents'
import Utilities from './pages/Utilities'

export default function App() {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/utilities" element={<Utilities />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  )
}
