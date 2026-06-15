import Navbar from '../common/Navbar'
import Footer from '../common/Footer'

export default function MainLayout({ children }) {
  return (
    <div className="flex flex-col min-h-screen bg-slate-950">
      <Navbar />
      <main className="flex-1 w-full">
        {children}
      </main>
      <Footer />
    </div>
  )
}
