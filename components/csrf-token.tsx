// components/csrf-token.tsx - single cookie
"use client";

import { useState, useEffect } from "react";

function getCSRFToken(): string {
  if (typeof window === "undefined") return "";

  // Read from the single csrf_token cookie
  const match = document.cookie.match(/csrf_token=([^;]+)/);
  return match ? match[1] : "";
}

function isEmbedMode(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("embed") === "true";
}

export function CSRFTokenInput() {
  const { token, isReady } = useCSRFToken();

  if (!isReady) {
    return null;
  }

  // In embed mode, CSRF is handled server-side via referer check
  if (!token && !isEmbedMode()) {
    return null;
  }

  return <input type="hidden" name="csrf_token" value={token || ""} />;
}

export function useCSRFToken(): { token: string; isReady: boolean } {
  const [token, setToken] = useState<string>("");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Small delay to ensure middleware has had time to set the cookie
    const timer = setTimeout(() => {
      const csrfToken = getCSRFToken();
      setToken(csrfToken);
      setIsReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return { token, isReady };
}