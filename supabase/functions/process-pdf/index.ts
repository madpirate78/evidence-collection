// supabase/functions/process-pdf/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PDFDocument } from 'https://cdn.skypack.dev/pdf-lib'
import * as pdfjs from 'https://cdn.skypack.dev/pdfjs-dist'

// Configure PDF.js worker
const pdfjsWorker = await import('https://cdn.skypack.dev/pdfjs-dist/build/pdf.worker.min.js')
if (typeof window === 'undefined') {
  // @ts-ignore
  globalThis.window = { pdfjsWorker }
}

serve(async (req) => {
  try {
    // Get request body
    const { filePath, submissionId, fileId } = await req.json()
    
    // Create a Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Download the PDF from storage
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('evidence_documents')
      .download(filePath)
    
    if (downloadError) {
      throw new Error(`Error downloading PDF: ${downloadError.message}`)
    }
    
    // Convert the file to ArrayBuffer
    const arrayBuffer = await fileData.arrayBuffer()
    
    // Use PDF.js to extract text
    // @ts-ignore
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer })
    const pdf = await loadingTask.promise
    
    let extractedText = ''
    
    // Extract text from each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map((item: any) => item.str).join(' ')
      extractedText += pageText + '\n\n'
    }
    
    // Optimize and compress the PDF if needed
    const pdfDoc = await PDFDocument.load(arrayBuffer)
    
    // Compress PDF
    const compressedPdfBytes = await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
    })
    
    // If the compressed version is smaller, save it
    if (compressedPdfBytes.byteLength < arrayBuffer.byteLength) {
      // Upload compressed version
      const compressedFilePath = filePath.replace('.pdf', '_compressed.pdf')
      
      const { error: uploadError } = await supabase
        .storage
        .from('evidence_documents')
        .upload(compressedFilePath, compressedPdfBytes, {
          contentType: 'application/pdf',
          cacheControl: '3600',
          upsert: true
        })
      
      if (uploadError) {
        throw new Error(`Error uploading compressed PDF: ${uploadError.message}`)
      }
      
      // Update the file record with the compressed path
      await supabase
        .from('file_uploads')
        .update({
          optimized_storage_path: compressedFilePath,
          optimized_file_size: compressedPdfBytes.byteLength
        })
        .eq('file_id', fileId)
    }
    
    // Store the extracted text
    await supabase
      .from('file_content')
      .insert({
        file_id: fileId,
        submission_id: submissionId,
        content: extractedText,
        content_type: 'text/plain',
        processing_status: 'completed'
      })
    
    // Update the file upload status
    await supabase
      .from('file_uploads')
      .update({
        status: 'processed',
        text_extracted: true
      })
      .eq('file_id', fileId)
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'PDF processed successfully',
        textLength: extractedText.length,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    )
    
  } catch (error) {
    console.error('Error processing PDF:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})