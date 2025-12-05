// app/not-found.tsx - 404 page for CMS Scandal platform
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-2xl mx-auto text-center">
        {/* Coming Soon Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">
            🚧 Coming Soon
          </h3>
          <p className="text-blue-700 mb-4">
            We&apos;re actively building additional features to support the fight
            against CMS systemic failures:
          </p>
          <ul className="text-sm text-blue-600 space-y-2 text-left max-w-md mx-auto">
            <li>
              • <strong>Enhanced Data Review</strong> - Advanced analytics and
              insights
            </li>
            <li>
              • <strong>Whistleblower Protection</strong> - Additional security
              features
            </li>
            <li>
              • <strong>Case Study Library</strong> - Documented evidence
              patterns
            </li>
            <li>
              • <strong>Support Resources</strong> - Guidance for affected
              families
            </li>
          </ul>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-slate-800 mb-4">
            What you can do right now:
          </h3>

          <div className="flex justify-center">
            <Link
              href="/statement-portal"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Submit Evidence (3 mins)
            </Link>
          </div>

          <Link
            href="/"
            className="inline-block text-blue-600 hover:text-blue-800 underline font-medium"
          >
            ← Return to Homepage
          </Link>
        </div>

        {/* Contact/Updates */}
        <div className="mt-12 pt-8 border-t border-slate-200">
          <h4 className="font-medium text-slate-800 mb-2">
            Want updates when new features launch?
          </h4>
          <p className="text-sm text-slate-600 mb-4">
            Follow our progress or get involved with WTF - Working Towards
            Fairness
          </p>

          {/* Placeholder for future contact/newsletter signup */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="text-sm text-slate-500">
              <strong>Contact:</strong> Updates coming soon via platform
              announcements
            </p>
          </div>
        </div>

        {/* Emergency Support Notice */}
        <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            <strong>Need immediate support?</strong> If you&apos;re experiencing
            distress due to CMS issues:
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-2 text-sm">
            <a
              href="https://www.samaritans.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Samaritans: 116 123
            </a>
            <a
              href="https://bothparentsmatter.org.uk/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Both Parents Matter
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
