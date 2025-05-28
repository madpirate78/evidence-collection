// app/privacy/page.tsx
export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>

      <div className="prose max-w-none">
        <p className="text-gray-600 mb-6">
          Last updated: {new Date().toLocaleDateString("en-GB")}
        </p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">
            1. Information We Collect
          </h2>
          <p className="mb-4">We collect:</p>
          <ul className="list-disc list-inside mb-4 space-y-2">
            <li>Account information (email address)</li>
            <li>Evidence submissions (case details, impact statements)</li>
            <li>Technical data (IP address, browser information)</li>
            <li>Usage analytics (page views, form completions)</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">
            2. How We Use Your Information
          </h2>
          <p className="mb-4">Your information is used to:</p>
          <ul className="list-disc list-inside mb-4 space-y-2">
            <li>Provide and maintain the platform</li>
            <li>Compile anonymised evidence for legal proceedings</li>
            <li>Conduct research into systemic issues</li>
            <li>Improve our services</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">3. Data Protection</h2>
          <p className="mb-4">We protect your data through:</p>
          <ul className="list-disc list-inside mb-4 space-y-2">
            <li>End-to-end encryption</li>
            <li>Secure cloud hosting (Supabase)</li>
            <li>Regular security audits</li>
            <li>Access controls and audit logs</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">4. Your Rights (GDPR)</h2>
          <p className="mb-4">You have the right to:</p>
          <ul className="list-disc list-inside mb-4 space-y-2">
            <li>Access your personal data</li>
            <li>Correct inaccurate information</li>
            <li>Delete your account and data</li>
            <li>Export your data</li>
            <li>Object to processing</li>
            <li>Withdraw consent</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">5. Data Sharing</h2>
          <p className="mb-4">
            We do not sell or share your personal data with third parties.
            Anonymised data may be shared with:
          </p>
          <ul className="list-disc list-inside mb-4 space-y-2">
            <li>Legal representatives for judicial review</li>
            <li>Academic researchers (with appropriate ethics approval)</li>
            <li>Policy makers and parliamentary committees</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">6. Children's Privacy</h2>
          <p className="mb-4">
            We take special care with information about children. We recommend
            using initials or pseudonyms when referring to children in your
            submissions.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">7. Data Retention</h2>
          <p className="mb-4">
            We retain your data for as long as necessary for legal proceedings
            and research purposes, or until you request deletion.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">8. Contact</h2>
          <p>
            For privacy-related questions or to exercise your rights, contact:
            privacy@familyjusticegroup.org
          </p>
        </section>
      </div>
    </div>
  );
}
