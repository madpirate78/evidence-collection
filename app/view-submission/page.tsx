'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Session } from '@supabase/supabase-js'

// Define interface for submission data
interface Submission {
  id: number;
  created_at: string;
  user_id: string;
  full_name: string;
  email: string;
  case_number?: string;
  case_start_date?: string;
  issue_category: string;
  description: string;
  impact_statement?: string;
  consent_given: boolean;
  is_redacted?: boolean;
}

export default function ViewSubmissionPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const submissionId = searchParams.get('id')
  
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [formattedDate, setFormattedDate] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      
      if (session && submissionId) {
        try {
          const { data, error } = await supabase
            .from('evidence_submissions')
            .select('*')
            .eq('id', submissionId)
            .single()
          
          if (error) throw error
          
          if (data) {
            // Verify this submission belongs to the current user
            if (data.user_id !== session.user.id) {
              throw new Error('You do not have permission to view this submission')
            }
            
            setSubmission(data)
            
            // Format the date client-side
            const date = new Date(data.created_at)
            setFormattedDate(date.toLocaleDateString() + ' ' + date.toLocaleTimeString())
          }
        } catch (error: any) {
          console.error('Error fetching submission:', error)
          setError(error.message)
        }
      }
      
      setLoading(false)
    }
    
    getSession()
  }, [supabase, submissionId])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="max-w-md mx-auto bg-white p-6 rounded shadow mt-8">
        <h2 className="text-2xl font-bold mb-6">Please Sign In</h2>
        <p className="mb-6">You need to sign in to view submission details.</p>
        <Link 
          href="/submit-evidence"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 inline-block"
        >
          Sign In
        </Link>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto bg-white p-6 rounded shadow mt-8">
        <h2 className="text-2xl font-bold mb-6 text-red-600">Error</h2>
        <p className="mb-6">{error}</p>
        <Link 
          href="/dashboard"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 inline-block"
        >
          Back to Dashboard
        </Link>
      </div>
    )
  }

  if (!submission) {
    return (
      <div className="max-w-md mx-auto bg-white p-6 rounded shadow mt-8">
        <h2 className="text-2xl font-bold mb-6">Submission Not Found</h2>
        <p className="mb-6">The submission you're looking for could not be found or you don't have permission to view it.</p>
        <Link 
          href="/dashboard"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 inline-block"
        >
          Back to Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 rounded shadow mt-8">
      <h2 className="text-2xl font-bold mb-6">Evidence Submission Details</h2>
      
      {!submission.is_redacted && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 p-4 rounded">
          <p className="text-yellow-800 font-medium">
            This submission contains unredacted information. Consider redacting any sensitive personal information.
          </p>
          <div className="mt-3">
            <Link 
              href={`/redact?id=${submission.id}`}
              className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 inline-block"
            >
              Redact Sensitive Information
            </Link>
          </div>
        </div>
      )}
      
      <div className="space-y-6">
        <div className="bg-gray-50 rounded p-4 border border-gray-200">
          <h3 className="text-lg font-semibold mb-2">Submission Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Submitted On</p>
              <p>{formattedDate}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Issue Category</p>
              <p>{submission.issue_category}</p>
            </div>
            {submission.case_number && (
              <div>
                <p className="text-sm text-gray-500">Case Number</p>
                <p>{submission.case_number}</p>
              </div>
            )}
            {submission.case_start_date && (
              <div>
                <p className="text-sm text-gray-500">Case Start Date</p>
                <p>{submission.case_start_date}</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Your Information</h3>
            <div className="bg-gray-50 p-4 rounded border border-gray-200 mt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Full Name</p>
                  <p>{submission.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p>{submission.email}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold">Description of Issue</h3>
            <div className="bg-gray-50 p-4 rounded border border-gray-200 mt-2 whitespace-pre-wrap">
              {submission.description}
            </div>
          </div>
          
          {submission.impact_statement && (
            <div>
              <h3 className="text-lg font-semibold">Impact Statement</h3>
              <div className="bg-gray-50 p-4 rounded border border-gray-200 mt-2 whitespace-pre-wrap">
                {submission.impact_statement}
              </div>
            </div>
          )}
        </div>

        {/* Add PDF section */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold">Supporting Documents</h3>
          <div className="bg-gray-50 p-4 rounded border border-gray-200 mt-2">
            {submission.has_attachments ? (
              <div>
                <p>This submission has {submission.attachment_count} supporting document(s).</p>
                <div className="mt-3">
                  <Link
                    href={`/pdf-manager?id=${submission.id}`}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition inline-block"
                  >
                    View & Manage Documents
                  </Link>
                </div>
              </div>
            ) : (
              <div>
                <p>No supporting documents have been attached to this submission.</p>
                <div className="mt-3">
                  <Link
                    href={`/pdf-manager?id=${submission.id}`}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition inline-block"
                  >
                    Upload Documents
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-between mt-8">
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
          >
            Back to Dashboard
          </Link>
          
          {!submission.is_redacted && (
            <Link
              href={`/redact?id=${submission.id}`}
              className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition"
            >
              Redact Information
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}