// utils/dateUtils.ts

/**
 * Format date consistently between server and client
 * Returns ISO format during SSR to prevent hydration mismatches
 */
export function formatDate(date: string | Date, options?: { includeTime?: boolean }): string {
  // During SSR, return ISO format
  if (typeof window === 'undefined') {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }
  
  try {
    const d = new Date(date);
    
    if (isNaN(d.getTime())) {
      return 'Invalid date';
    }
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    
    let formatted = `${day}/${month}/${year}`;
    
    if (options?.includeTime) {
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      formatted += ` at ${hours}:${minutes}`;
    }
    
    return formatted;
  } catch (error) {
    console.error('Date formatting error:', error);
    return String(date);
  }
}

/**
 * Get relative time (e.g., "2 hours ago")
 */
export function getRelativeTime(date: string | Date): string {
  if (typeof window === 'undefined') {
    return '';
  }
  
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return formatDate(date);
}

/**
 * Format date for display in inputs
 */
export function formatDateForInput(date: string | Date): string {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

/**
 * Safe date component that handles SSR
 */
import React from 'react';

interface DateDisplayProps {
  date: string | Date;
  includeTime?: boolean;
  relative?: boolean;
  className?: string;
}

export function DateDisplay({ date, includeTime, relative, className }: DateDisplayProps) {
  const [mounted, setMounted] = React.useState(false);
  
  React.useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    // During SSR, show ISO date
    const d = new Date(date);
    return <span className={className}>{d.toISOString().split('T')[0]}</span>;
  }
  
  const formatted = relative ? getRelativeTime(date) : formatDate(date, { includeTime });
  
  return <span className={className}>{formatted}</span>;
}