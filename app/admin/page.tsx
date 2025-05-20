'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useState } from 'react'
import { Session } from '@supabase/supabase-js'

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [submissions, setSubmissions] = useState<any[]>([])
  const supabase = createClientComponentClient()

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      
      if (session) {
        // Fetch submissions
        const { data, error } = await supabase
          .from('evidence_submissions')
          .select('*')
          .order('created_at', { ascending: false })
        
        if (!error) {
          setSubmissions(data || [])
        }
      }
      
      setLoading(false)
    }
    
    getSession()
  }, [supabase])

  if (loading) {
    return <div>Loading...</div>
  }

  if (!session) {
    return (
      <div className="max-w-md mx-auto bg-white p-6 rounded shadow">
        <h2 className="text-2xl font-bold mb-6">Please Sign In</h2>
        <p className="mb-6">You need to sign in to access the admin dashboard.</p>
        <a 
          href="/submit-evidence"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Sign In
        </a>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded shadow">
          <h2 className="text-lg font-semibold mb-2">Total Submissions</h2>
          <p className="text-3xl font-bold">{submissions.length}</p>
        </div>
        
        <div className="bg-white p-6 rounded shadow">
          <h2 className="text-lg font-semibold mb-2">Categories</h2>
          <p className="text-3xl font-bold">
            {new Set(submissions.map(s => s.issue_category)).size}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded shadow">
          <h2 className="text-lg font-semibold mb-2">Recent Activity</h2>
          <p className="text-3xl font-bold">
            {submissions.filter(s => 
              new Date(s.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            ).length}
          </p>
          <p className="text-sm text-gray-500">Last 7 days</p>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded shadow overflow-auto">
        <h2 className="text-xl font-semibold mb-4">Evidence Submissions</h2>
        
        {submissions.length === 0 ? (
          <p>No submissions found.</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Case #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {submissions.map((submission) => (
                <tr key={submission.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(submission.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {submission.full_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {submission.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {submission.case_number || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {submission.issue_category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button className="text-blue-600 hover:text-blue-900">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
