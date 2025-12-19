import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-slate-300 mb-4">404</h1>
        <p className="text-xl text-slate-600 mb-8">Page not found</p>
        <Link
          href="/"
          className="text-blue-600 hover:text-blue-800 underline"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
