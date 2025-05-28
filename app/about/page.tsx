export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">
        About the CMS Evidence Collection Platform
      </h1>

      {/* Purpose Section */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-semibold mb-4 text-blue-800">
          Supporting Judicial Review
        </h2>
        <p className="mb-4">
          The Child Maintenance Service calculates financial support between
          separated parents. Current judicial review proceedings are examining
          whether these calculations adequately consider the welfare of children
          - a fundamental principle in family law.
        </p>
        <p className="mb-4">
          By collecting structured evidence from parents, we're collecting
          evidence of patterns about how the CMS actually operates, the reality
          of arrears, affordability, and the impact on children and families.
        </p>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-blue-800 font-medium">
            Does the current calculation method prioritise children's welfare?
            This platform gathers evidence to help answer this question.
          </p>
        </div>
      </div>

      {/* How Data is Used */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-semibold mb-4">How Your Data is Used</h2>
        <div className="space-y-4">
          <div className="flex items-start">
            <div className="bg-green-100 rounded-full p-2 mr-4">
              <svg
                className="w-5 h-5 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-medium mb-1">Judicial Review Evidence</h3>
              <p className="text-gray-600">
                Anonymised data is compiled into reports for legal proceedings
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="bg-green-100 rounded-full p-2 mr-4">
              <svg
                className="w-5 h-5 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-medium mb-1">Pattern Analysis</h3>
              <p className="text-gray-600">
                Identifying systemic issues to strengthen reform arguments
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="bg-green-100 rounded-full p-2 mr-4">
              <svg
                className="w-5 h-5 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-medium mb-1">Parliamentary Submissions</h3>
              <p className="text-gray-600">
                Anonymised evidence presented to Lords Committee and MPs
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Security & Privacy */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-semibold mb-4">
          Security & Privacy Commitments
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium mb-3 text-green-700">What We Do</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span>Encrypt all data in transit and at rest</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span>Allow complete data deletion at any time</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span>Anonymise all data before use in reports</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span>Comply fully with GDPR requirements</span>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium mb-3 text-red-700">What We Don't Do</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start">
                <span className="text-red-600 mr-2">✗</span>
                <span>Share personal data with third parties</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-600 mr-2">✗</span>
                <span>Use data for commercial purposes</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-600 mr-2">✗</span>
                <span>Store data longer than necessary</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-600 mr-2">✗</span>
                <span>Allow unauthorised access to submissions</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Key Issues Section */}
      <div className="bg-amber-50 p-6 rounded-lg shadow mb-8 border border-amber-200">
        <h2 className="text-xl font-semibold mb-4 text-amber-900">
          Key Issues We're Documenting
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded border border-amber-300">
            <h3 className="font-medium text-amber-800 mb-2">
              Unreasonable demands
            </h3>
            <p className="text-sm">
              Percentage of cases where payments exceed 50% of net income
            </p>
          </div>
          <div className="bg-white p-4 rounded border border-amber-300">
            <h3 className="font-medium text-amber-800 mb-2">
              Unrecognised expenses
            </h3>
            <p className="text-sm">
              Average unrecognised direct spending on children
            </p>
          </div>
          <div className="bg-white p-4 rounded border border-amber-300">
            <h3 className="font-medium text-amber-800 mb-2">
              Child needs not considered
            </h3>
            <p className="text-sm">
              Proportion of cases where children's needs weren't considered
            </p>
          </div>
          <div className="bg-white p-4 rounded border border-amber-300">
            <h3 className="font-medium text-amber-800 mb-2">Impact</h3>
            <p className="text-sm">Impact on children's wellbeing scores</p>
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="bg-gray-100 rounded-lg p-6 text-center">
        <h2 className="text-xl font-semibold mb-4">Contact & Support</h2>
        <p className="mb-4">
          For questions about the platform, data security, or how to contribute:
        </p>
        <div className="space-y-2">
          <p className="font-medium">Email: evidence@4545justice345454.org</p>
          <p className="text-sm text-gray-600">Response within 48 hours</p>
        </div>
        <div className="mt-6 pt-6 border-t border-gray-300">
          <p className="text-sm text-gray-600 mb-4">
            If you're experiencing distress due to CMS issues, support is
            available:
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center text-sm">
            <a
              href="https://www.samaritans.org"
              className="text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Samaritans: 116 123
            </a>
            <a
              href="https://bothparentsmatter.org.uk/"
              className="text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Both Parents Matter
            </a>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="mt-12 text-center">
        <h2 className="text-2xl font-semibold mb-4">Your Voice Matters</h2>
        <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
          Every submission strengthens our case. Together, we're building
          evidence of systemic problems that demand reform.
        </p>
        <a
          href="/statement-portal"
          className="inline-block px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
        >
          Submit Your Evidence
        </a>
      </div>
    </div>
  );
}
