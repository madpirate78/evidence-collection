export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">About This Project</h1>
      
      <div className="bg-white p-6 rounded shadow mb-8">
        <h2 className="text-xl font-semibold mb-4">Our Mission</h2>
        <p className="mb-4">This platform aims to collect evidence about issues with the Child Maintenance Service (CMS) in order to identify systemic problems and advocate for improvements.</p>
        <p>By gathering real experiences from people affected by CMS issues, we can build a comprehensive database that highlights patterns, quantifies impacts, and provides evidence for policy reform.</p>
      </div>
      
      <div className="bg-white p-6 rounded shadow mb-8">
        <h2 className="text-xl font-semibold mb-4">How Your Evidence Helps</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="p-4 rounded-lg bg-gray-50">
            <h3 className="font-medium mb-2">Identify Patterns</h3>
            <p className="text-sm">Your evidence helps us identify common issues and systemic failures within the CMS system.</p>
          </div>
          <div className="p-4 rounded-lg bg-gray-50">
            <h3 className="font-medium mb-2">Quantify Impact</h3>
            <p className="text-sm">We can measure the financial and emotional impact of CMS issues on families and children.</p>
          </div>
          <div className="p-4 rounded-lg bg-gray-50">
            <h3 className="font-medium mb-2">Drive Change</h3>
            <p className="text-sm">Evidence-based advocacy is more effective at achieving meaningful policy reforms.</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded shadow mb-8">
        <h2 className="text-xl font-semibold mb-4">Data Security & Privacy</h2>
        <p className="mb-4">We take the security and privacy of your personal information extremely seriously:</p>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li>All data is encrypted both in transit and at rest</li>
          <li>Personal identifiers are separated from case details</li>
          <li>We only collect information necessary for documenting CMS issues</li>
          <li>Evidence is anonymized before being included in any reports</li>
          <li>You retain the right to access, export, or delete your data at any time</li>
          <li>We are fully GDPR compliant</li>
        </ul>
      </div>
      
      <div className="text-center mt-8">
        <a 
          href="/submit-evidence" 
          className="px-6 py-3 rounded-lg text-lg font-semibold bg-blue-600 text-white hover:bg-blue-700"
        >
          Submit Your Evidence
        </a>
      </div>
    </div>
  )
}
