'use client'

import { useEffect } from 'react'

interface TestModeIndicatorProps {
  isTestMode?: boolean
}

export default function TestModeIndicator({ isTestMode = false }: TestModeIndicatorProps) {
  useEffect(() => {
    if (isTestMode) {
      // Add red background to body for visual indication
      document.body.classList.add('!bg-red-50')
      document.body.classList.remove('bg-gray-50')
    }
  }, [isTestMode])

  if (!isTestMode) return null

  return (
    <div className="bg-red-600 text-white text-center py-2 text-sm font-bold sticky top-0 z-50">
      Evidence Collection - Dev Mode
    </div>
  )
}