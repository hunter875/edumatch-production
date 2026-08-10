import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { AuthProvider } from '@/lib/auth'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { RealTimeProvider } from '@/providers/RealTimeProvider'
import { ToastProvider } from '@/providers/ToastProvider'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as HotToaster } from 'react-hot-toast'
import {QueryProvider} from '@/providers/QueryProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'EduMatch - Smart Platform for Scholarships and Research Opportunities',
  description: 'Connect students with research opportunities and scholarships using AI-powered matching.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <LanguageProvider>
          <QueryProvider>
            <AuthProvider>
              <RealTimeProvider>
                <ToastProvider>
                  <div className="min-h-screen bg-background flex flex-col">
                    <Navbar />
                    <main className="flex-1">
                      {children}
                    </main>
                    <Footer />
                  </div>
                  <Toaster />
                  <HotToaster 
                    position="top-right"
                    toastOptions={{
                      duration: 5000,
                      style: {
                        background: '#fff',
                        color: '#333',
                        border: '1px solid #e5e7eb',
                        marginTop: '80px',
                      },
                      success: {
                        iconTheme: {
                          primary: '#10b981',
                          secondary: '#fff',
                        },
                      },
                      error: {
                        iconTheme: {
                          primary: '#ef4444',
                          secondary: '#fff',
                        },
                      },
                    }}
                  />
                </ToastProvider>
              </RealTimeProvider>
            </AuthProvider>
          </QueryProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}
