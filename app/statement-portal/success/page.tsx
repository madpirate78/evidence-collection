"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function SuccessPage() {
  const router = useRouter();

  // Create Supabase client
  const supabase = createClient();

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/sign-in");
      }
    };

    checkAuth();
  }, [router]);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
        <div className="mb-4">
          <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
            <svg
              className="h-8 w-8 text-green-600"
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
        </div>

        <h1 className="text-2xl font-bold text-green-800 mb-4">
          Evidence Submitted Successfully!
        </h1>

        <p className="text-green-700 mb-6">
          Thank you for contributing to the CMS evidence collection. Your
          submission has been securely stored and will be included in the
          judicial review.
        </p>

        <div className="bg-white rounded-lg p-4 mb-6 text-left">
          <h2 className="font-semibold text-gray-800 mb-2">
            What happens next?
          </h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>
                Your evidence is now part of the growing case against CMS
                discrimination
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>
                You can view and manage your submission in your dashboard
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>You can redact sensitive information at any time</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>
                Your data remains under your control and can be deleted if
                needed
              </span>
            </li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            View Dashboard
          </Link>
          <Link
            href="/statistics"
            className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
          >
            See Live Statistics
          </Link>
        </div>

        <p className="text-sm text-gray-500 mt-6">
          Every submission strengthens our case for reform. Thank you for your
          courage.
        </p>
      </div>
    </div>
  );
}
