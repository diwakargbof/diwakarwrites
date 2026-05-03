import type { Metadata } from 'next'
import './globals.css'
import NavBar from '@/components/NavBar'
import Footer from '@/components/Footer'
import Sidebar from '@/components/Sidebar'

export const metadata: Metadata = {
  title: 'Diwakar · Notebook, Habits, Library',
  description: 'Writing, tracking, and living out loud.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NavBar />
        <Sidebar />
        <div className="main-offset">
          <div style={{ minHeight: 'calc(100vh - var(--nav-h) - 61px)' }}>
            {children}
          </div>
          <Footer />
        </div>
      </body>
    </html>
  )
}
