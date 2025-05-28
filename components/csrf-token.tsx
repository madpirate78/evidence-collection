// components/csrf-token.tsx
"use client";

import { useState, useEffect } from "react";
import { CSRFToken } from "@/utils/security";

/**
 * Hidden input component that auto-injects CSRF token into forms
 */
export function CSRFTokenInput() {
  const [token, setToken] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Try to get from client-readable cookie first
      const cookies = document.cookie.split(";");
      const csrfCookie = cookies.find((c) =>
        c.trim().startsWith("csrf_token_client=")
      );

      if (csrfCookie) {
        const cookieToken = csrfCookie.split("=")[1];
        setToken(cookieToken);
        // Also set in sessionStorage for consistency
        sessionStorage.setItem("csrf_token", cookieToken);
      } else {
        // If no cookie, we need to request one from the server
        // This is the issue - the token isn't being set server-side
        fetch("/api/csrf-token")
          .then((res) => res.json())
          .then((data) => setToken(data.token))
          .catch(() => {
            // Fallback to client generation
            const newToken = CSRFToken.get();
            setToken(newToken);
          });
      }
    }
  }, []);

  if (!token) return null;

  return <input type="hidden" name="csrf_token" value={token} />;
}

/**
 * Hook to get CSRF token for use in fetch requests
 */
export function useCSRFHeaders() {
  const [headers, setHeaders] = useState<HeadersInit>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = CSRFToken.get();
      if (token) {
        setHeaders({
          "X-CSRF-Token": token,
        });
      }
    }
  }, []);

  return headers;
}

/**
 * Protected form wrapper that automatically includes CSRF token
 */
interface ProtectedFormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode;
}

export function ProtectedForm({ children, ...props }: ProtectedFormProps) {
  return (
    <form {...props}>
      <CSRFTokenInput />
      {children}
    </form>
  );
}
