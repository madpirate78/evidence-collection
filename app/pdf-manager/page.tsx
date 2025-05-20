'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Session } from '@supabase/supabase-js'
import PDFUploader from '../components/PDFUploader'
import PDFViewer from '../components/PDFViewer'

interface FileUpload {
  id: number;
  file_id: string;
  submission_id: number;
  filename: string;
  storage_path: string;
  file_size: number;
  file_type: string;
  status: string;
  text_extracted: boolean;
  created_at: string;
}

export default function PDFManagerPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const submissionId = searchParams.get('id')
  
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [fileUploads, setFileUploads] = useState<FileUpload[]>([])
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [submissionDetails, setSubmissionDetails] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      
      if (session && submissionId) {
        try {
          // Fetch submission details
          const { data: submission, error: submissionError } = await supabase
            .from('evidence_submissions')
            .select('*')
            .eq('id', submissionId)
            .single()
          
          if (submissionError) throw submissionError
          
          // Verify this submission belongs to the current user
          if (submission.user_id !== session.user.id) {
            throw new Error('You do not have permission to view this submission')
          }
          
          setSubmissionDetails(submission)
          
          // Fetch file uploads for this submission
          const { data: files, error: filesError } = await supabase
            .from('file_uploads')
            .select('*')
            .eq('submission_id', submissionId)
            .order('created_at', { ascending: false })
          
          if (filesError) throw filesError
          
          setFileUploads(files || [])
          
          // If files exist, select the first one by default
          if (files && files.length > 0) {
            setSelectedFileId(files[0].file_id)
          }
          
        } catch (error: any) {
          console.error('Error fetching data:', error)
          setError(error.message)
        }
      }
      
      setLoading(false)
    }
    
    getSession()
  }, [supabase, submissionId])
  
  // Handle upload completion
  const handleUploadComplete = (fileDetails: any) => {
    // Refresh the file list
    if (session && submissionId) {
      supabase
        .from('file_uploads')
        .select('*')
        .eq('submission_id', submissionId)
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (!error && data) {
            setFileUploads(data)
            // Select the newly uploaded file
            setSelectedFileId(fileDetails.fileId)
          }
        })
    }
  }
  
  // Get the public URL for a file
  const getFileUrl = (filePath: string) => {
    const { data } = supabase.storage
      .from('evidence_documents')
      .getPublicUrl(filePath)
    
    return data.publicUrl
  }
  
  // Handle when redactions are complete
  const handleRedactionComplete = async (redactedTextMap: Record<number, string[]>) => {
    if (!submissionId) return
    
    try {
      // Update the submission to mark it as redacted
      await supabase
        .from('evidence_submissions')
        .update({
          is_redacted: true
        })
        .eq('id', submissionId)
      
      // Update the submission details locally
      setSubmissionDetails(prev => ({
        ...prev,
        is_redacted: true
      }))
      
    } catch (error: any) {
      console.error('Error updating redaction status:', error)
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
        <p className="mb-6">You need to sign in to manage PDF evidence.</p>
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

  if (!submissionDetails) {
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
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">PDF Evidence Manager</h1>
        <Link 
          href="/dashboard"
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
        >
          Back to Dashboard
        </Link>
      </div>
      
      <div className="mb-6 bg-white p-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-4">Submission Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-gray-600">Issue:</span> {submissionDetails.issue_category}
          </div>
          <div>
            <span className="text-gray-600">Status:</span> {submissionDetails.is_redacted ? 'Redacted' : 'Needs Redaction'}
          </div>
          <div>
            <span className="text-gray-600">Case Number:</span> {submissionDetails.case_number || 'N/A'}
          </div>
          <div>
            <span className="text-gray-600">Date:</span> {new Date(submissionDetails.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>
      
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <div className="bg-white p-4 rounded shadow mb-6">
            <h2 className="text-lg font-semibold mb-4">PDF Uploads</h2>
            <PDFUploader 
              submissionId={parseInt(submissionId!)} 
              onUploadComplete={handleUploadComplete}
            />
          </div>
          
          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-lg font-semibold mb-4">Your Documents</h2>
            
            {fileUploads.length === 0 ? (
              <p className="text-gray-500">No documents uploaded yet.</p>
            ) : (
              <ul className="space-y-3">
                {fileUploads.map(file => (
                  <li 
                    key={file.file_id}
                    className={`p-3 rounded border cursor-pointer transition ${
                      selectedFileId === file.file_id ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                    onClick={() => setSelectedFileId(file.file_id)}
                  >
                    <div className="flex items-center">
                      <svg className="w-6 h-6 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <div className="flex-1 truncate">
                        <p className="font-medium">{file.filename}</p>
                        <p className="text-xs text-gray-500">
                          {(file.file_size / 1024).toFixed(1)} KB • 
                          {file.text_extracted ? ' Text extracted' : ' Processing...'}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        
        <div className="md:col-span-2">
          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-lg font-semibold mb-4">PDF Viewer & Redaction Tool</h2>
            
            {selectedFileId ? (
              (() => {
                const selectedFile = fileUploads.find(file => file.file_id === selectedFileId)
                
                if (!selectedFile) {
                  return <p className="text-gray-500">File not found</p>
                }
                
                if (selectedFile.status !== 'processed') {
                  return (
                    <div className="p-6 bg-gray-50 border border-gray-200 rounded text-center">
                      <svg className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <p className="text-gray-700 font-medium">Processing document...</p>
                      <p className="text-gray-500 text-sm mt-1">This may take a minute. We're extracting text for redaction.</p>
                    </div>
                  )
                }
                
                const fileUrl = getFileUrl(selectedFile.storage_path)
                
                return (
                  <PDFViewer
                    fileId={selectedFileId}
                    fileUrl={fileUrl}
                    onRedactionComplete={handleRedactionComplete}
                  />
                )
              })()
            ) : (
              <div className="p-6 bg-gray-50 border border-gray-200 rounded text-center">
                <p className="text-gray-700">Select a document to view or upload a new PDF</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-6 bg-gray-100 p-4 rounded-md text-sm text-gray-600">
        <h3 className="font-medium mb-2">Redaction Instructions</h3>
        <ol className="list-decimal list-inside space-y-1">
          <li>Select text in the document that contains sensitive information</li>
          <li>Click the "Redact Selected" button to mark it for redaction</li>
          <li>Repeat for all sensitive information</li>
          <li>Click "Save All Redactions" when complete</li>
          <li>The redacted text will be replaced with black boxes (█████)</li>
        </ol>
      </div>
    </div>
  )
}