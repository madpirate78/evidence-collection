'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useState } from 'react'
import { Session } from '@supabase/supabase-js'
import Link from 'next/link'

// Define interfaces for typing
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
}

export default function DashboardPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [formattedDates, setFormattedDates] = useState<Record<number, string>>({})
  const supabase = createClientComponentClient()

  // Handle client-side date formatting to avoid hydration errors
  useEffect(() => {
    if (submissions.length > 0) {
      const dates: Record<number, string> = {}
      submissions.forEach(submission => {
        dates[submission.id] = new Date(submission.created_at).toLocaleDateString()
      })
      setFormattedDates(dates)
    }
  }, [submissions])

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      
      if (session) {
        fetchSubmissions(session.user.id)
      } else {
        setLoading(false)
      }
      
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (_event, session) => {
          setSession(session)
          
          if (session) {
            fetchSubmissions(session.user.id)
          } else {
            setLoading(false)
          }
        }
      )
      
      return () => subscription.unsubscribe()
    }
    
    getSession()
  }, [supabase])
  
  const fetchSubmissions = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('evidence_submissions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (error) {
        throw error
      }
      
      setSubmissions(data || [])
    } catch (error: any) {
      console.error('Error fetching submissions:', error.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="container mx-auto py-8 px-4">Loading...</div>
  }

  if (!session) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-md mx-auto bg-white p-6 rounded shadow">
          <h2 className="text-2xl font-bold mb-6">Please Sign In</h2>
          <p className="mb-6">You need to sign in to view your dashboard.</p>
          <Link 
            href="/submit-evidence"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Your Dashboard</h1>
        
        <div className="bg-white p-6 rounded shadow mb-8">
  <h2 className="text-lg font-semibold mb-2">Welcome, {session.user.email}</h2>
  <p className="mb-4">Here you can track your evidence submissions and their status.</p>
  
  <div className="mt-4 flex space-x-4">
    <Link 
      href="/submit-evidence"
      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
    >
      Submit New Evidence
    </Link>
    
    <button
      onClick={async () => {
        const { error } = await supabase.auth.signOut()
        if (error) {
          console.error('Error signing out:', error)
        }
      }}
      className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
    >
      Sign Out
    </button>
  </div>
</div>
        
        <div className="bg-white p-6 rounded shadow">
          <h2 className="text-xl font-semibold mb-4">Your Submissions</h2>
          
          {submissions.length === 0 ? (
            <p>You haven't submitted any evidence yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Case #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {submissions.map((submission) => (
                    <tr key={submission.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {/* Use server-safe format for initial render, then switch to formatted date */}
                        {formattedDates[submission.id] || submission.created_at.split('T')[0]}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {submission.case_number || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {submission.issue_category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link 
                          href={`/view-submission?id=${submission.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}