'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useState } from 'react'
import { Session } from '@supabase/supabase-js'
import Link from 'next/link'
import AuthComponent from '@/app/components/AuthComponent'

export default function SubmitEvidencePage() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    case_number: '',
    case_start_date: '',
    issue_category: 'Payment Issues',
    description: '',
    impact_statement: '',
    consent_given: false
  })
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      
      // Pre-fill email if user is logged in
      if (session?.user?.email) {
        setFormData(prev => ({
          ...prev,
          email: session.user.email || ''
        }))
      }
      
      setLoading(false)
    }
    
    getSession()
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        
        // Update email when user logs in
        if (session?.user?.email) {
          setFormData(prev => ({
            ...prev,
            email: session.user.email || ''
          }))
        }
      }
    )
    
    return () => subscription.unsubscribe()
  }, [supabase])
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name } = e.target;
    
    // Type guard to check if the element has the 'checked' property
    if (e.target instanceof HTMLInputElement && e.target.type === 'checkbox') {
      // Handle checkbox input
      setFormData({
        ...formData,
        [name]: e.target.checked
      });
    } else {
      // Handle text, textarea, select inputs
      setFormData({
        ...formData,
        [name]: e.target.value
      });
    }
  };
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    
    try {
      if (!session) {
        throw new Error('You must be signed in to submit evidence')
      }
      
      const { error } = await supabase
        .from('evidence_submissions')
        .insert({
          ...formData,
          user_id: session.user.id
        })
      
      if (error) throw error
      
      setMessage({
        type: 'success',
        text: 'Your evidence has been submitted successfully. Thank you for your contribution!'
      })
      
      // Reset form
      setFormData({
        full_name: '',
        email: session.user.email || '',
        case_number: '',
        case_start_date: '',
        issue_category: 'Payment Issues',
        description: '',
        impact_statement: '',
        consent_given: false
      })
    } catch (error: any) {
      console.error('Error submitting evidence:', error)
      setMessage({
        type: 'error',
        text: error.message
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  // Authentication section:
  return (
    <div>
      {!session ? (
        <AuthComponent />
      ) : (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-6">Submit CMS Evidence</h2>
            
            {message && (
              <div className={`mb-6 p-4 rounded-md ${
                message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {message.text}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* The rest of your form remains the same */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Full Name</label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    required
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              {/* Case details */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">CMS Case Number (if known)</label>
                  <input
                    type="text"
                    name="case_number"
                    value={formData.case_number}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Case Start Date</label>
                  <input
                    type="date"
                    name="case_start_date"
                    value={formData.case_start_date}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              {/* Issue category */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Issue Category</label>
                <select
                  name="issue_category"
                  value={formData.issue_category}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option>Payment Issues</option>
                  <option>Calculation Errors</option>
                  <option>Enforcement Problems</option>
                  <option>Customer Service</option>
                  <option>Delays</option>
                  <option>Communication Issues</option>
                  <option>Other</option>
                </select>
              </div>
              
              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Description of Issue</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows={4}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Please describe the issues you've experienced with CMS in detail..."
                ></textarea>
              </div>
              
              {/* Impact statement */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">How has this impacted you?</label>
                <textarea
                  name="impact_statement"
                  value={formData.impact_statement}
                  onChange={handleChange}
                  rows={4}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Please describe any financial, emotional, or other impacts..."
                ></textarea>
              </div>
              
              {/* Consent checkbox */}
              <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="consent_given"
                    checked={formData.consent_given}
                    onChange={handleChange}
                    required
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <label className="ml-2 block text-sm text-gray-700">
                    I consent to my data being processed for the purpose of documenting CMS issues (GDPR)
                  </label>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Your data will be stored securely and only used for the purpose of documenting CMS issues. You can request deletion at any time.
                </p>
              </div>
              
              {/* Submit button */}
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={async () => {
                    const { error } = await supabase.auth.signOut()
                    if (error) {
                      console.error('Error signing out:', error)
                    }
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
                >
                  Sign Out
                </button>
                
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-6 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition ${
                    submitting ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {submitting ? 'Submitting...' : 'Submit Evidence'}
                </button>
              </div>
            </form>
          </div>
          
              <div className="mt-6 bg-gray-100 p-4 rounded-md text-sm text-gray-600">
              <p className="font-medium mb-2">What happens next?</p>
              <p className="mb-2">After submission, you'll be able to:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Review your submission details</li>
                <li>Upload PDF documentation as supporting evidence</li>
                <li>Redact sensitive information from your submission and documents</li>
              </ol>
              <p className="mt-2">Your evidence will be added to our secure database and used to identify patterns in CMS issues.</p>
            </div>
        </div>
      )}
    </div>
  )
}