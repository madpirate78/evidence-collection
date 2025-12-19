"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { notifyIframeResize } from "@/app/ClientLayout";

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const isEmbed = searchParams.get("embed") === "true";

  useEffect(() => {
    localStorage.removeItem("statementDraft");
    localStorage.removeItem("statementDraftSaved");
    sessionStorage.clear();

    // Notify parent iframe of new height
    notifyIframeResize();
  }, []);

  return (
    <div className="max-w-xl mx-auto p-4">
      <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
        <div className="mx-auto h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <svg
            className="h-6 w-6 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h1 className="text-xl font-bold text-green-800 mb-2">
          Survey Submitted
        </h1>

        <p className="text-green-700">
          Thank you for contributing to this research.
        </p>

        {!isEmbed && (
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
            <Link
              href="/statistics"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
            >
              View Statistics
            </Link>
            <Link
              href="/"
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition text-sm"
            >
              Return Home
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
