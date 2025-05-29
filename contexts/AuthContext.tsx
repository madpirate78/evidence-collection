// contexts/AuthContext.tsx - Without admin functionality
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  Suspense,
} from "react";
import { Session, User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialised: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  initialised: false,
  error: null,
  signOut: async () => {},
  refreshAuth: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

// Separate component that uses useSearchParams with Suspense
function AuthProviderWithSearchParams({
  children,
  requireAuth = false,
}: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    initialised: false,
    error: null,
  });

  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const authListenerRef = useRef<any>(null);

  // Update auth state helper
  const updateAuthState = useCallback((updates: Partial<AuthState>) => {
    setAuthState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Initialize auth with better post-login handling
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Check if we just authenticated (look for authenticated param)
        const justAuthenticated = searchParams.get("authenticated") === "true";

        // Get initial session
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error("Error getting initial session:", error);
          updateAuthState({
            error: error.message,
            loading: false,
            initialised: true,
          });
          return;
        }

        // If we just authenticated but don't have a session yet, wait and retry
        if (justAuthenticated && !session) {
          // Retry after a brief delay
          setTimeout(async () => {
            const {
              data: { session: retrySession },
            } = await supabase.auth.getSession();
            if (retrySession?.user && mounted) {
              updateAuthState({
                user: retrySession.user,
                session: retrySession,
                loading: false,
                initialised: true,
                error: null,
              });
            }
          }, 100);
          return;
        }

        if (session?.user) {
          if (mounted) {
            updateAuthState({
              user: session.user,
              session,
              loading: false,
              initialised: true,
              error: null,
            });
          }
        } else {
          // No session
          if (mounted) {
            updateAuthState({
              user: null,
              session: null,
              loading: false,
              initialised: true,
              error: null,
            });

            if (requireAuth && !justAuthenticated) {
              router.push("/sign-in");
            }
          }
        }

        // Set up auth state listener
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!mounted) return;
          if (event === "SIGNED_IN" && session) {
            updateAuthState({
              user: session.user,
              session,
              error: null,
            });
          } else if (event === "SIGNED_OUT") {
            updateAuthState({
              user: null,
              session: null,
              error: null,
            });

            if (requireAuth) {
              router.push("/sign-in");
            }
          } else if (event === "TOKEN_REFRESHED" && session) {
            updateAuthState({
              session,
              user: session.user,
            });
          }
        });

        authListenerRef.current = subscription;
      } catch (err) {
        console.error("Error initializing auth:", err);
        if (mounted) {
          updateAuthState({
            error:
              err instanceof Error ? err.message : "Failed to initialize auth",
            loading: false,
            initialised: true,
          });
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      if (authListenerRef.current) {
        authListenerRef.current.unsubscribe();
      }
    };
  }, [supabase, router, requireAuth, updateAuthState, searchParams]);

  // Auth state management
  const signOut = async () => {
    try {
      // Clear state FIRST for instant UI update
      updateAuthState({
        user: null,
        session: null,
        loading: false,
        error: null,
      });

      // Navigate immediately
      router.push("/");

      // Then clean up in background
      supabase.auth.signOut().catch((error) => {
        console.error("Background signout error:", error);
      });
    } catch (error) {
      console.error("Sign out error:", error);
      updateAuthState({
        error: error instanceof Error ? error.message : "Sign out failed",
        loading: false,
      });
    }
  };

  // Refresh auth state
  const refreshAuth = async () => {
    try {
      updateAuthState({ loading: true });

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) throw error;

      if (session?.user) {
        updateAuthState({
          user: session.user,
          session,
          loading: false,
          error: null,
        });
      } else {
        updateAuthState({
          user: null,
          session: null,
          loading: false,
          error: null,
        });
      }
    } catch (err) {
      console.error("Error refreshing auth:", err);
      updateAuthState({
        error:
          err instanceof Error
            ? err.message
            : "Failed to refresh authentication",
        loading: false,
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        signOut,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Main AuthProvider with Suspense boundary
export function AuthProvider(props: AuthProviderProps) {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-gray-600 text-sm">Loading...</p>
          </div>
        </div>
      }
    >
      <AuthProviderWithSearchParams {...props} />
    </Suspense>
  );
}
