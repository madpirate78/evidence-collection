import React, { useState } from 'react'
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react'

interface FormData {
  full_name: string;
  email: string;
  case_number: string;
  case_start_date: string;
  issue_category: string;
  description: string;
  impact_statement: string;
  consent_given: boolean;
}

export default function EvidenceForm() {
  const supabase = useSupabaseClient()
  const user = useUser()
  const [formData, setFormData] = useState<FormData>({
    full_name: '',
    email: '',
    case_number: '',
    case_start_date: '',
    issue_category: 'Payment Issues',
    description: '',
    impact_statement: '',
    consent_given: false
  })
  const [loading, setLoading] = useState<boolean>(false)
  const [message, setMessage] = useState<string | null>(null)
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    const checked = (e.target as HTMLInputElement).checked
    
    setFormData({
      ...formData,
      [name]: e.target.type === 'checkbox' ? checked : value
    })
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      if (!user) throw new Error('No user logged in')
      
      const { error } = await supabase
        .from('evidence_submissions')
        .insert({
          ...formData,
          user_id: user.id
        })
        
      if (error) throw error
      
      setMessage('Evidence submitted successfully. Thank you!')
      setFormData({
        full_name: '',
        email: '',
        case_number: '',
        case_start_date: '',
        issue_category: 'Payment Issues',
        description: '',
        impact_statement: '',
        consent_given: false
      })
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="max-w-2xl mx-auto p-4 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-6">Submit CMS Evidence</h2>
      
      {message && (
        <div className="mb-4 p-3 bg-blue-50 text-blue-800 rounded">
          {message}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Full Name</label>
          <input
            type="text"
            name="full_name"
            value={formData.full_name}
            onChange={handleChange}
            required
            className="w-full p-2 border rounded"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Email Address</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full p-2 border rounded"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">CMS Case Number (if known)</label>
          <input
            type="text"
            name="case_number"
            value={formData.case_number}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Case Start Date</label>
          <input
            type="date"
            name="case_start_date"
            value={formData.case_start_date}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Issue Category</label>
          <select
            name="issue_category"
            value={formData.issue_category}
            onChange={handleChange}
            className="w-full p-2 border rounded"
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
        
        <div>
          <label className="block text-sm font-medium mb-1">Description of Issue</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            rows={4}
            className="w-full p-2 border rounded"
            placeholder="Please describe the issues you've experienced with CMS in detail..."
          ></textarea>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">How has this impacted you?</label>
          <textarea
            name="impact_statement"
            value={formData.impact_statement}
            onChange={handleChange}
            rows={4}
            className="w-full p-2 border rounded"
            placeholder="Please describe any financial, emotional, or other impacts..."
          ></textarea>
        </div>
        
        <div className="pt-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="consent_given"
              checked={formData.consent_given}
              onChange={handleChange}
              required
              className="mr-2"
            />
            <span className="text-sm">I consent to my data being processed for the purpose of documenting CMS issues (GDPR)</span>
          </label>
        </div>
        
        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            {loading ? 'Submitting...' : 'Submit Evidence'}
          </button>
        </div>
      </form>
    </div>
  )
}
