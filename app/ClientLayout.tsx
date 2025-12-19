"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";

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

// Dispatch this event when iframe content changes height (e.g., form questions appear)
export function notifyIframeResize() {
  window.dispatchEvent(new CustomEvent("iframe-content-changed"));
}

function useEmbedHeightMessaging(isEmbed: boolean, containerRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    if (!isEmbed) return;

    let lastHeight = 0;

    const sendHeight = () => {
      // Small delay to let DOM settle after changes
      setTimeout(() => {
        // Measure the actual container content, not scrollHeight which doesn't shrink
        const container = containerRef.current;
        if (!container) return;

        // Force reflow to get accurate height after content changes
        const height = container.getBoundingClientRect().height;
        const roundedHeight = Math.ceil(height);

        if (roundedHeight !== lastHeight) {
          lastHeight = roundedHeight;
          window.parent.postMessage({ type: "resize", height: roundedHeight }, "*");
        }
      }, 50);
    };

    // Send initial height
    sendHeight();

    // Listen for content change events from form
    window.addEventListener("iframe-content-changed", sendHeight);

    return () => {
      window.removeEventListener("iframe-content-changed", sendHeight);
    };
  }, [isEmbed, containerRef]);
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const isEmbed = searchParams.get("embed") === "true";
  const embedContainerRef = useRef<HTMLDivElement>(null);

  useEmbedHeightMessaging(isEmbed, embedContainerRef);

  if (isEmbed) {
    return (
      <div ref={embedContainerRef} className="bg-slate-50">
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
