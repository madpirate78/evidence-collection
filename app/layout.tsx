'use client'

import "./globals.css"
import Link from "next/link"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body className="bg-gray-50 min-h-screen flex flex-col">
        <header className="bg-blue-600 text-white shadow-md">
          <div className="container mx-auto px-4 py-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-1">
                <Link href="/" className="text-xl font-bold">CMS Evidence Collection</Link>
              </div>
              <nav className="hidden md:flex space-x-8">
                <Link href="/" className="hover:text-blue-200 transition">Home</Link>
                <Link href="/submit-evidence" className="hover:text-blue-200 transition">Submit Evidence</Link>
                <Link href="/dashboard" className="hover:text-blue-200 transition">Dashboard</Link>
                <Link href="/about" className="hover:text-blue-200 transition">About</Link>
                <Link href="/admin" className="hover:text-blue-200 transition">Admin</Link>
              </nav>
              <div className="md:hidden">
                {/* Mobile menu button - would need JS to toggle */}
                <button className="p-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </header>
        
        <main className="flex-1 container mx-auto px-4 py-8">
          {children}
        </main>
        
        <footer className="bg-blue-700 text-white mt-auto">
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="mb-4 md:mb-0">
                <h3 className="text-lg font-semibold mb-2">CMS Evidence Collection</h3>
                <p className="text-blue-100 text-sm">Documenting experiences to drive change</p>
              </div>
              <div className="flex space-x-4 text-sm">
                <Link href="/about" className="text-blue-100 hover:text-white transition">About</Link>
                <Link href="/privacy-policy" className="text-blue-100 hover:text-white transition">Privacy Policy</Link>
                <Link href="/terms" className="text-blue-100 hover:text-white transition">Terms of Use</Link>
                <Link href="/contact" className="text-blue-100 hover:text-white transition">Contact</Link>
              </div>
            </div>
            <div className="mt-6 text-center text-sm text-blue-200">
              <p>© {new Date().getFullYear()} CMS Evidence Collection. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}