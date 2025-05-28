// app/ClientLayout.tsx
"use client";

import Link from "next/link";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";

// Navigation component that uses the auth context
function Navigation() {
  const { user, loading, signOut, initialised } = useAuth();

  return (
    <header className="bg-blue-600 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link
              href="/"
              className="font-bold text-xl hover:text-blue-200 transition"
            >
              CMS Evidence
            </Link>
            <nav className="hidden md:flex space-x-6">
              <Link
                href="/statistics"
                className="hover:text-blue-200 transition"
              >
                Statistics
              </Link>
              <Link href="/about" className="hover:text-blue-200 transition">
                About
              </Link>
              {user && (
                <>
                  <Link
                    href="/dashboard"
                    className="hover:text-blue-200 transition"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/statement-portal"
                    className="hover:text-blue-200 transition"
                  >
                    Submit Evidence
                  </Link>
                </>
              )}
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            {!initialised || loading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-blue-200 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm text-blue-200">Loading...</span>
              </div>
            ) : user ? (
              <>
                <span className="text-sm text-blue-200 hidden sm:inline">
                  {user.email}
                </span>
                <button
                  onClick={signOut}
                  className="text-sm hover:text-blue-200 transition px-3 py-1 border border-blue-400 rounded hover:bg-blue-700"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                href="/sign-in"
                className="text-sm hover:text-blue-200 transition px-3 py-1 border border-blue-400 rounded hover:bg-blue-700"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

// Footer component - fixed hydration issue
function Footer() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <footer className="bg-gray-800 text-white py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-semibold mb-2">About This Platform</h3>
            <p className="text-sm text-gray-300">
              Documenting systemic discrimination in the UK Child Maintenance
              Service to support judicial review and drive reform.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Quick Links</h3>
            <ul className="space-y-1 text-sm">
              <li>
                <Link
                  href="/about"
                  className="text-gray-300 hover:text-white transition"
                >
                  About the Project
                </Link>
              </li>
              <li>
                <Link
                  href="/statistics"
                  className="text-gray-300 hover:text-white transition"
                >
                  Live Statistics
                </Link>
              </li>
              <li>
                <Link
                  href="/statement-portal"
                  className="text-gray-300 hover:text-white transition"
                >
                  Submit Evidence
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Support</h3>
            <p className="text-sm text-gray-300 mb-2">
              If you're experiencing distress due to CMS issues:
            </p>
            <ul className="space-y-1 text-sm">
              <li>
                <a
                  href="https://www.samaritans.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-300 hover:text-white transition"
                >
                  Samaritans: 116 123
                </a>
              </li>
              <li>
                <a
                  href="https://bothparentsmatter.org.uk/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-300 hover:text-white transition"
                >
                  Both Parents Matter
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-4 border-t border-gray-700 text-center text-sm text-gray-400">
          <p>
            &copy; {new Date().getFullYear()} CMS Evidence Collection Platform
          </p>
          <p className="mt-1">
            {mounted ? (
              <>
                {new Date().toLocaleDateString("en-GB")} | Your data is
                protected under GDPR
              </>
            ) : (
              "Your data is protected under GDPR"
            )}
          </p>
        </div>
      </div>
    </footer>
  );
}

// Main layout component - always check auth for nav, but don't block page loading
export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navigation />
        <main className="flex-grow container mx-auto px-4 py-8">
          {children}
        </main>
        <Footer />
      </div>
    </AuthProvider>
  );
}
