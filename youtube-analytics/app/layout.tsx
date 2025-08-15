import './globals.css'
import { Inter } from 'next/font/google'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'YouTube Analytics Dashboard',
  description: 'Advanced analytics for your YouTube viewing patterns',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <div className="flex h-screen bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
              <Topbar />
              <main className="flex-1 overflow-auto lg:pl-0 pl-0">
                {children}
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  )
}