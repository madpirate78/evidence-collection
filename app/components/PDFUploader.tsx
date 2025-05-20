'use client'

import { useState, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface UploadProps {
  submissionId: number
  onUploadComplete: (fileDetails: {
    filename: string;
    fileUrl: string;
    fileSize: number;
    fileId: string;
  }) => void
}

export default function PDFUploader({ submissionId, onUploadComplete }: UploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClientComponentClient()
  
  // Maximum file size in bytes (10MB)
  const MAX_FILE_SIZE = 10 * 1024 * 1024
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setError(null)
      
      const files = event.target.files
      if (!files || files.length === 0) {
        return
      }
      
      const file = files[0]
      
      // Check if file is a PDF
      if (file.type !== 'application/pdf') {
        setError('Only PDF files are accepted')
        return
      }
      
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        setError(`File size exceeds the maximum limit of 10MB. Please compress the PDF before uploading.`)
        return
      }
      
      setUploading(true)
      
      // Generate a unique filename
      const fileId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const fileExt = file.name.split('.').pop()
      const fileName = `${submissionId}_${fileId}.${fileExt}`
      const filePath = `evidence_uploads/${fileName}`
      
      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('evidence-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })
      
      if (uploadError) {
        throw uploadError
      }
      
      // Get public URL for the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from('evidence-documents')
        .getPublicUrl(filePath)
      
      // Create record in the file_uploads table
      const { error: dbError } = await supabase
        .from('file_uploads')
        .insert({
          submission_id: submissionId,
          filename: file.name,
          storage_path: filePath,
          file_size: file.size,
          file_type: file.type,
          status: 'uploaded',
          file_id: fileId
        })
      
      if (dbError) {
        throw dbError
      }
      
      // Trigger the PDF processing via API route
      try {
        const response = await fetch('/api/process-pdf', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filePath,
            submissionId,
            fileId
          })
        });
        
        if (!response.ok) {
          console.warn('PDF processing returned non-OK status:', response.status);
        }
      } catch (processingError) {
        console.error('PDF processing error:', processingError);
        // Continue anyway - we'll handle processing errors separately
      }
      
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      // Call the onUploadComplete callback
      onUploadComplete({
        filename: file.name,
        fileUrl: publicUrl,
        fileSize: file.size,
        fileId
      })
      
    } catch (error: any) {
      console.error('Error uploading file:', error)
      setError(error.message || 'Error uploading file')
    } finally {
      setUploading(false)
    }
  }
  
  return (
    <div className="w-full">
      <div className="mb-2 font-medium">Upload PDF Evidence</div>
      
      {error && (
        <div className="mb-3 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <div className="flex items-center mb-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          disabled={uploading}
          className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
        />
      </div>
      
      {uploading && (
        <div className="flex items-center text-sm text-blue-600">
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Uploading PDF...
        </div>
      )}
      
      <div className="text-xs text-gray-500 mt-2">
        <p>Supported file type: PDF only</p>
        <p>Maximum file size: 10MB</p>
      </div>
    </div>
  )
}