'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Session } from '@supabase/supabase-js'

// Define interface for submission data
interface Submission {
  id: number;
  description: string;
  full_name: string;
  email: string;
  case_number?: string;
  is_redacted?: boolean;
  [key: string]: any; // For other properties
}

export default function RedactPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const submissionId = searchParams.get('id')
  
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [redactedText, setRedactedText] = useState('')
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)
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
            setSubmission(data)
            setRedactedText(data.description || '')
          }
        } catch (error: any) {
          console.error('Error fetching submission:', error)
          setMessage({
            type: 'error',
            text: `Failed to load submission: ${error.message}`
          })
        }
      }
      
      setLoading(false)
    }
    
    getSession()
  }, [supabase, submissionId])
  
  const handleRedact = () => {
    const selection = window.getSelection()
    if (!selection || !selection.toString()) {
      setMessage({
        type: 'error',
        text: 'Please select text before trying to redact.'
      })
      return
    }
    
    const selectedText = selection.toString()
    const newText = redactedText.replace(selectedText, '█'.repeat(selectedText.length))
    setRedactedText(newText)
    
    // Clear message after showing for a brief period
    setMessage({
      type: 'success',
      text: 'Text redacted successfully!'
    })
    
    setTimeout(() => {
      setMessage(null)
    }, 3000)
  }
  
  const handleSave = async () => {
    if (!submissionId) {
      setMessage({
        type: 'error',
        text: 'Missing submission ID'
      })
      return
    }
    
    try {
      setMessage(null)
      
      const { error } = await supabase
        .from('evidence_submissions')
        .update({
          description: redactedText,
          is_redacted: true
        })
        .eq('id', submissionId)
      
      if (error) throw error
      
      setMessage({
        type: 'success',
        text: 'Your redacted evidence has been saved successfully!'
      })
      
      // Redirect to dashboard after a delay
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (error: any) {
      console.error('Error saving redacted text:', error)
      setMessage({
        type: 'error',
        text: `Error saving: ${error.message}`
      })
    }
  }

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
        <p className="mb-6">You need to sign in to redact sensitive information.</p>
        <Link 
          href="/submit-evidence"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 inline-block"
        >
          Sign In
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
      <h2 className="text-2xl font-bold mb-6">Redact Sensitive Information</h2>
      
      {message && (
        <div className={`mb-6 p-4 rounded ${
          message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message.text}
        </div>
      )}
      
      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded">
        <h3 className="text-lg font-semibold text-red-700 mb-2">Important</h3>
        <p className="text-sm text-red-700 mb-2">Please redact the following types of sensitive information:</p>
        <ul className="list-disc pl-6 text-sm text-red-700">
          <li>Children's full names (first name only is okay)</li>
          <li>Home addresses</li>
          <li>Phone numbers</li>
          <li>Bank account details</li>
          <li>National Insurance numbers</li>
        </ul>
      </div>
      
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-medium">Your Evidence Description</h3>
          <button
            onClick={handleRedact}
            className="px-3 py-1 bg-black text-white text-sm rounded hover:bg-gray-800 transition"
          >
            ⬛ Redact Selected Text
          </button>
        </div>
        
        <div 
          className="p-4 border rounded min-h-[200px] bg-white"
          style={{ whiteSpace: 'pre-wrap' }}
        >
          {redactedText}
        </div>
        <p className="text-sm text-gray-600 mt-2">Select any text that contains sensitive information, then click "Redact Selected Text".</p>
      </div>
      
      <div className="flex justify-between">
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
        >
          Cancel
        </Link>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
        >
          Save Redacted Version
        </button>
      </div>
    </div>
  )
}