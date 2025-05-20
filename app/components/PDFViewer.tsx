'use client'

import { useState, useEffect, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import * as pdfjs from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.entry'

// Use evidence-documents bucket (with hyphen instead of underscore)

interface PDFViewerProps {
  fileId: string
  fileUrl: string
  onRedactionComplete?: (redactedTextMap: Record<number, string[]>) => void
}

export default function PDFViewer({ fileId, fileUrl, onRedactionComplete }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [extractedText, setExtractedText] = useState<string[]>([])
  const [redactions, setRedactions] = useState<Record<number, string[]>>({})
  const [selectedText, setSelectedText] = useState<string>('')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const textLayerRef = useRef<HTMLDivElement>(null)
  const supabase = createClientComponentClient()

  // Load PDF and extracted text
  useEffect(() => {
    async function loadPDFData() {
      try {
        setIsLoading(true)
        
        // Load the extracted text from the database
        const { data, error } = await supabase
          .from('file_content')
          .select('content')
          .eq('file_id', fileId)
          .single()
        
        if (error) {
          console.error('Error fetching extracted text:', error)
        } else if (data?.content) {
          // Split content by pages (assuming double newlines separate pages)
          const textByPages = data.content.split('\n\n')
          setExtractedText(textByPages)
        }
        
        // Load PDF document
        const loadingTask = pdfjs.getDocument(fileUrl)
        const pdf = await loadingTask.promise
        setNumPages(pdf.numPages)
        
        // Render the first page
        renderPage(pdf, 1)
        
      } catch (error) {
        console.error('Error loading PDF:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadPDFData()
  }, [fileId, fileUrl, supabase])
  
  // Handle page navigation
  const changePage = async (offset: number) => {
    const newPageNumber = pageNumber + offset
    
    if (newPageNumber >= 1 && newPageNumber <= numPages) {
      setPageNumber(newPageNumber)
      
      // Re-render the PDF page
      const loadingTask = pdfjs.getDocument(fileUrl)
      const pdf = await loadingTask.promise
      renderPage(pdf, newPageNumber)
    }
  }
  
  // Render a specific page of the PDF
  const renderPage = async (pdf: any, pageNum: number) => {
    try {
      const page = await pdf.getPage(pageNum)
      
      const canvas = canvasRef.current
      const textLayer = textLayerRef.current
      
      if (!canvas || !textLayer) return
      
      // Clear the text layer
      while (textLayer.firstChild) {
        textLayer.removeChild(textLayer.firstChild)
      }
      
      const viewport = page.getViewport({ scale: 1.5 })
      
      // Set canvas dimensions
      canvas.height = viewport.height
      canvas.width = viewport.width
      
      // Render PDF page to canvas
      const renderContext = {
        canvasContext: canvas.getContext('2d'),
        viewport
      }
      
      await page.render(renderContext).promise
      
      // Get text content for the page
      const textContent = await page.getTextContent()
      
      // Set text layer dimensions
      textLayer.style.height = `${viewport.height}px`
      textLayer.style.width = `${viewport.width}px`
      
      // Create text layer
      pdfjs.renderTextLayer({
        textContent,
        container: textLayer,
        viewport,
        textDivs: []
      })
      
    } catch (error) {
      console.error('Error rendering page:', error)
    }
  }
  
  // Handle text selection for redaction
  const handleTextSelection = () => {
    const selection = window.getSelection()
    
    if (selection && selection.toString().trim() !== '') {
      setSelectedText(selection.toString())
    }
  }
  
  // Apply redaction to the selected text
  const applyRedaction = () => {
    if (!selectedText || selectedText.trim() === '') return
    
    // Update redactions state
    setRedactions(prev => {
      const pageRedactions = prev[pageNumber] || []
      return {
        ...prev,
        [pageNumber]: [...pageRedactions, selectedText]
      }
    })
    
    // Clear the selection
    setSelectedText('')
    window.getSelection()?.removeAllRanges()
    
    // If callback provided, call it with the updated redactions
    if (onRedactionComplete) {
      onRedactionComplete({
        ...redactions,
        [pageNumber]: [...(redactions[pageNumber] || []), selectedText]
      })
    }
  }
  
  // Save redactions to the database
  const saveRedactions = async () => {
    try {
      // Create a redacted version of the text
      let redactedText = [...extractedText]
      
      // Apply redactions to each page
      Object.entries(redactions).forEach(([pageIndex, redactedStrings]) => {
        const pageIdx = parseInt(pageIndex) - 1
        
        if (pageIdx >= 0 && pageIdx < redactedText.length) {
          let pageContent = redactedText[pageIdx]
          
          // Replace each redacted string with black boxes
          redactedStrings.forEach(str => {
            pageContent = pageContent.replace(
              new RegExp(str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
              '█'.repeat(str.length)
            )
          })
          
          redactedText[pageIdx] = pageContent
        }
      })
      
      // Join the pages back together
      const fullRedactedText = redactedText.join('\n\n')
      
      // Save to database
      const { error } = await supabase
        .from('file_content')
        .upsert({
          file_id: fileId,
          content: fullRedactedText,
          content_type: 'text/plain',
          is_redacted: true,
          redacted_at: new Date().toISOString()
        })
      
      if (error) {
        throw error
      }
      
      alert('Redactions saved successfully')
      
    } catch (error) {
      console.error('Error saving redactions:', error)
      alert('Error saving redactions: ' + error.message)
    }
  }
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-60">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }
  
  return (
    <div className="pdf-viewer bg-gray-100 p-4 rounded-lg">
      <div className="controls flex items-center justify-between mb-4 bg-white p-2 rounded shadow-sm">
        <div className="flex gap-2">
          <button
            onClick={() => changePage(-1)}
            disabled={pageNumber <= 1}
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => changePage(1)}
            disabled={pageNumber >= numPages}
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
        
        <div>
          Page {pageNumber} of {numPages}
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={applyRedaction}
            disabled={!selectedText}
            className="px-3 py-1 bg-black text-white rounded disabled:opacity-50"
          >
            Redact Selected
          </button>
          <button
            onClick={saveRedactions}
            className="px-3 py-1 bg-green-600 text-white rounded"
          >
            Save All Redactions
          </button>
        </div>
      </div>
      
      <div className="relative bg-white shadow-md rounded">
        <canvas ref={canvasRef} className="border border-gray-300"></canvas>
        <div 
          ref={textLayerRef} 
          className="absolute top-0 left-0 text-layer"
          style={{ 
            pointerEvents: 'none', 
            opacity: 0 
          }}
        ></div>
        
        {/* Overlay for selection */}
        <div 
          className="absolute top-0 left-0 w-full h-full"
          onMouseUp={handleTextSelection}
          style={{ 
            pointerEvents: 'auto', 
            cursor: 'text'
          }}
        ></div>
      </div>
      
      {/* Show extracted text with redactions */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-2">Extracted Text (Page {pageNumber})</h3>
        <div className="bg-white p-4 border border-gray-300 rounded max-h-60 overflow-y-auto whitespace-pre-wrap">
          {pageNumber > 0 && pageNumber <= extractedText.length ? (
            <div>
              {/* Apply redactions to displayed text */}
              {(() => {
                let text = extractedText[pageNumber - 1] || ''
                const pageRedactions = redactions[pageNumber] || []
                
                // Apply each redaction
                pageRedactions.forEach(redaction => {
                  const regex = new RegExp(redaction.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
                  text = text.replace(regex, '█'.repeat(redaction.length))
                })
                
                return text
              })()}
            </div>
          ) : (
            <p className="text-gray-500">No text available for this page</p>
          )}
        </div>
      </div>
      
      {/* Show current redactions for this page */}
      {redactions[pageNumber] && redactions[pageNumber].length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Redactions on Page {pageNumber}</h3>
          <ul className="bg-red-50 p-3 border border-red-200 rounded">
            {redactions[pageNumber].map((redaction, index) => (
              <li key={index} className="mb-1 flex items-center gap-2">
                <span className="bg-black text-white px-1">Redacted</span>
                <span className="text-red-600 font-mono">{redaction}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}