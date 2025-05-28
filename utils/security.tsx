// utils/security.tsx - Client-side CSRF utilities
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { nanoid } from "nanoid";

/**
 * CSRF Token Management (client-side only)
 */
export class CSRFToken {
  private static TOKEN_NAME = "csrf_token";
  private static TOKEN_HEADER = "X-CSRF-Token";

  /**
   * Generate a new CSRF token
   */
  static generate(): string {
    return nanoid(32);
  }

  /**
   * Get or create CSRF token (client-side)
   */
  static get(): string {
    if (typeof window === "undefined") {
      console.warn("CSRFToken.get() called on server");
      return "";
    }

    let token = sessionStorage.getItem(this.TOKEN_NAME);
    if (!token) {
      token = this.generate();
      sessionStorage.setItem(this.TOKEN_NAME, token);
    }
    return token;
  }

  /**
   * Extract CSRF token from request headers
   */
  static getFromHeaders(headers: Headers): string | null {
    return headers.get(this.TOKEN_HEADER);
  }

  /**
   * Add CSRF token to fetch headers
   */
  static addToHeaders(headers: HeadersInit = {}): HeadersInit {
    if (typeof window === "undefined") return headers;

    const token = this.get();
    return {
      ...headers,
      [this.TOKEN_HEADER]: token,
    };
  }
}

/**
 * React hook for CSRF protection in forms
 */
export function useCSRFToken() {
  const [token, setToken] = useState<string>("");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Only run on client
    if (typeof window !== "undefined") {
      const csrfToken = CSRFToken.get();
      setToken(csrfToken);
      setIsReady(true);
    }
  }, []);

  const addToFormData = useCallback(
    (formData: FormData) => {
      if (token) {
        formData.append("csrf_token", token);
      }
      return formData;
    },
    [token]
  );

  const addToHeaders = useCallback(
    (headers: HeadersInit = {}): HeadersInit => {
      if (token) {
        return {
          ...headers,
          "X-CSRF-Token": token,
        };
      }
      return headers;
    },
    [token]
  );

  return {
    token,
    isReady,
    addToFormData,
    addToHeaders,
  };
}

/**
 * Debounce hook
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  ) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

/**
 * Secure form hook with CSRF protection
 */
export function useSecureForm<T extends Record<string, any>>(
  initialData: T,
  onSubmit: (data: T, csrfToken: string) => Promise<void>
) {
  const [formData, setFormData] = useState(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { token: csrfToken, isReady: csrfReady } = useCSRFToken();

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();

      if (!csrfReady || !csrfToken) {
        setError("Security token not ready. Please try again.");
        return;
      }

      setIsSubmitting(true);
      setError(null);

      try {
        await onSubmit(formData, csrfToken);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Submission failed");
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, onSubmit, csrfToken, csrfReady]
  );

  const updateField = useCallback((field: keyof T, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const reset = useCallback(() => {
    setFormData(initialData);
    setError(null);
  }, [initialData]);

  return {
    formData,
    isSubmitting,
    error,
    handleSubmit,
    updateField,
    reset,
    setFormData,
    csrfToken,
    csrfReady,
  };
}
