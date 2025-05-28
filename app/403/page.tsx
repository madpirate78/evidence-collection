import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-md w-full">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <div className="mb-4">
            <svg
              className="mx-auto h-16 w-16 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-red-800 mb-2">
            403 - Access Forbidden
          </h1>

          <p className="text-red-700 mb-6">
            You do not have permission to access this page.
          </p>

          <p className="text-sm text-red-600 mb-8">
            This incident has been logged. If you believe this is an error,
            please contact the system administrator.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/dashboard"
              className="inline-block px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/"
              className="inline-block px-6 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
            >
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
