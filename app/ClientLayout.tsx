"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

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

function useEmbedHeightMessaging(isEmbed: boolean) {
  useEffect(() => {
    if (!isEmbed) return;

    const sendHeight = () => {
      window.parent.postMessage(
        { type: "resize", height: document.body.scrollHeight },
        "*"
      );
    };

    // Send initial height
    sendHeight();

    // Send on resize
    window.addEventListener("resize", sendHeight);

    // Observe DOM changes (form fields appearing/disappearing)
    const observer = new MutationObserver(sendHeight);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    return () => {
      window.removeEventListener("resize", sendHeight);
      observer.disconnect();
    };
  }, [isEmbed]);
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const isEmbed = searchParams.get("embed") === "true";

  useEmbedHeightMessaging(isEmbed);

  if (isEmbed) {
    return (
      <div className="bg-slate-50">
        <main className="container mx-auto px-4 py-8 max-w-7xl">
          {children}
        </main>
      </div>
    );
  }

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

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <LayoutContent>{children}</LayoutContent>
    </Suspense>
  );
}
