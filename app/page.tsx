import Link from 'next/link'

export default function Home() {
  return (
    <div>
      {/* Hero Section */}
      <div className="bg-blue-600 text-white rounded-lg shadow-xl overflow-hidden mb-12">
        <div className="max-w-5xl mx-auto px-4 py-16 md:py-20 md:px-10">
          <div className="md:w-2/3">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              Document Your Experience with Child Maintenance Service
            </h1>
            <p className="text-lg md:text-xl mb-8 text-blue-100">
              Help build a database of evidence to improve the system for everyone. Your experiences matter and can drive meaningful change.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                href="/submit-evidence" 
                className="bg-white text-blue-600 hover:bg-blue-50 transition px-6 py-3 rounded-md font-semibold text-center"
              >
                Submit Your Evidence
              </Link>
              <Link 
                href="/about" 
                className="bg-blue-700 hover:bg-blue-800 transition text-white px-6 py-3 rounded-md font-semibold text-center"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* How It Works Section */}
      <div className="mb-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
            <div className="bg-blue-100 text-blue-600 w-12 h-12 rounded-full flex items-center justify-center mb-4 font-bold text-xl">1</div>
            <h3 className="text-xl font-semibold mb-3">Create an Account</h3>
            <p className="text-gray-600">Sign up securely to access our evidence submission system. Your privacy is our priority.</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
            <div className="bg-blue-100 text-blue-600 w-12 h-12 rounded-full flex items-center justify-center mb-4 font-bold text-xl">2</div>
            <h3 className="text-xl font-semibold mb-3">Submit Your Evidence</h3>
            <p className="text-gray-600">Document your experiences and upload supporting files. Our redaction tools help protect sensitive information.</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
            <div className="bg-blue-100 text-blue-600 w-12 h-12 rounded-full flex items-center justify-center mb-4 font-bold text-xl">3</div>
            <h3 className="text-xl font-semibold mb-3">Make an Impact</h3>
            <p className="text-gray-600">Your evidence contributes to understanding systemic issues and advocating for meaningful changes.</p>
          </div>
        </div>
      </div>
      
      {/* Stats Section */}
      <div className="bg-white rounded-lg shadow-md p-8 mb-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">Making a Difference</h2>
        <div className="grid md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-4xl font-bold text-blue-600 mb-2">100+</div>
            <p className="text-gray-600">Evidence submissions collected</p>
          </div>
          <div>
            <div className="text-4xl font-bold text-blue-600 mb-2">6</div>
            <p className="text-gray-600">Issue categories identified</p>
          </div>
          <div>
            <div className="text-4xl font-bold text-blue-600 mb-2">3</div>
            <p className="text-gray-600">Policy recommendations made</p>
          </div>
        </div>
      </div>
      
      {/* CTA Section */}
      <div className="bg-gray-100 rounded-lg p-8 text-center">
        <h2 className="text-2xl md:text-3xl font-semibold mb-4">Ready to Share Your Experience?</h2>
        <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
          Join others in documenting CMS issues to help drive systemic change. Your experience matters.
        </p>
        <Link 
          href="/submit-evidence" 
          className="bg-blue-600 hover:bg-blue-700 transition text-white px-6 py-3 rounded-md font-semibold inline-block"
        >
          Submit Your Evidence
        </Link>
      </div>
    </div>
  )
}