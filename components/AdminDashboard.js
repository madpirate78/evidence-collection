'use client'  // This is important! It tells Next.js this is a client component

import React, { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function AdminDashboard() {
  const supabase = createClientComponentClient()  // Create Supabase client
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    // Fetch submissions when component mounts
    const fetchSubmissions = async () => {
      setLoading(true)
      
      try {
        // Get all submissions from the database
        const { data, error } = await supabase
          .from('evidence_submissions')
          .select('*')
          .order('created_at', { ascending: false })
          
        if (error) throw error
        
        setSubmissions(data || [])
      } catch (error) {
        console.error('Error fetching submissions:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchSubmissions()
  }, [])  // Empty dependency array means this runs only once when component mounts
  
  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6">Evidence Submissions</h2>
      
      {loading ? (
        <p>Loading submissions...</p>
      ) : (
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Case Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                    No submissions yet
                  </td>
                </tr>
              ) : (
                submissions.map((submission) => (
                  <tr key={submission.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(submission.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {submission.full_name}
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
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
