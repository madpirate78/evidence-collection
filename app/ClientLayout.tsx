"use client";

import Link from "next/link";

function Navigation() {
  return (
    <header className="bg-slate-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link
              href="/"
              className="font-bold text-xl hover:text-wtf-orange transition"
            >
              CMS Policy Research
            </Link>
            <nav className="hidden md:flex space-x-6">
              <Link
                href="/statement-portal"
                className="hover:text-wtf-orange transition font-medium"
              >
                Submit Evidence
              </Link>
              <Link
                href="/statistics"
                className="hover:text-wtf-orange transition font-medium"
              >
                Statistics
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="bg-slate-800 text-white py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 text-center text-sm text-slate-400">
        <p>&copy; {new Date().getFullYear()} CMS Policy Research</p>
      </div>
    </footer>
  );
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navigation />
      <main className="flex-grow container mx-auto px-4 py-8 max-w-7xl">
        {children}
      </main>
      <Footer />
    </div>
  );
}
