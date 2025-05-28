// app/terms/page.tsx
export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>

      <div className="prose max-w-none">
        <p className="text-gray-600 mb-6">
          Last updated: {new Date().toLocaleDateString("en-GB")}
        </p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">1. Acceptance of Terms</h2>
          <p className="mb-4">
            By accessing and using the CMS Evidence Collection Platform, you
            agree to be bound by these Terms of Service and our Privacy Policy.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">
            2. Purpose of the Platform
          </h2>
          <p className="mb-4">
            This platform is designed to collect evidence of discrimination and
            systematic issues within the UK Child Maintenance Service to
            support:
          </p>
          <ul className="list-disc list-inside mb-4 space-y-2">
            <li>Judicial review proceedings</li>
            <li>Parliamentary submissions</li>
            <li>Academic research into family justice</li>
            <li>Policy reform advocacy</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">
            3. User Responsibilities
          </h2>
          <p className="mb-4">You agree to:</p>
          <ul className="list-disc list-inside mb-4 space-y-2">
            <li>Provide truthful and accurate information</li>
            <li>Only submit evidence relating to your own experiences</li>
            <li>Respect the privacy of others, including children</li>
            <li>Not misuse the platform for malicious purposes</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">4. Data Usage</h2>
          <p className="mb-4">
            Your evidence may be used in anonymised form for legal proceedings,
            research, and policy advocacy. You retain the right to:
          </p>
          <ul className="list-disc list-inside mb-4 space-y-2">
            <li>Request deletion of your data at any time</li>
            <li>Redact sensitive information</li>
            <li>Withdraw consent for specific uses</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">5. Disclaimer</h2>
          <p className="mb-4">
            This platform is provided for information and evidence collection
            purposes only. We do not provide legal advice.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">6. Contact</h2>
          <p>
            For questions about these terms, please contact:
            evidence@familyjusticegroup.org
          </p>
        </section>
      </div>
    </div>
  );
}
