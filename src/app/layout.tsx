import type { Metadata } from 'next'
import './globals.css'
import NavBar from '@/components/NavBar'
import Footer from '@/components/Footer'
import Sidebar from '@/components/Sidebar'
import MobileDataStrip from '@/components/MobileDataStrip'
import StickyTodo from '@/components/StickyTodo'
import VoiceLogger from '@/components/VoiceLogger'
import PublicShell from '@/components/public/PublicShell'
import { isAdmin } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'Diwakar Reddy',
  description: 'Writing, and a wall anyone can write on.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Two entirely separate shells: the tracker for me, a reading room for
  // everyone else. Nothing private renders inside the public one.
  const admin = await isAdmin()

  return (
    <html lang="en">
      <body>
        {admin ? (
          <>
            <NavBar />
            <Sidebar />
            <MobileDataStrip />
            <StickyTodo />
            <VoiceLogger />
            <div className="main-offset">
              <div style={{ minHeight: 'calc(100vh - var(--nav-h) - 61px)' }}>
                {children}
              </div>
              <Footer />
            </div>
          </>
        ) : (
          <PublicShell>{children}</PublicShell>
        )}
      </body>
    </html>
  )
}
