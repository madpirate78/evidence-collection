// contexts/AuthContext.tsx - Fixed with Suspense boundary
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
  isAdmin: boolean;
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
  isAdmin: false,
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
  requireAdmin?: boolean;
}

// Separate component that uses useSearchParams with Suspense
function AuthProviderWithSearchParams({
  children,
  requireAuth = false,
  requireAdmin = false,
}: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    initialised: false,
    error: null,
    isAdmin: false,
  });

  const router = useRouter();
  const searchParams = useSearchParams(); // This now has Suspense boundary
  const supabase = createClient();
  const authListenerRef = useRef<any>(null);

  // Update auth state helper
  const updateAuthState = useCallback((updates: Partial<AuthState>) => {
    setAuthState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Check admin status
  const checkAdminStatus = useCallback(
    async (userId: string): Promise<boolean> => {
      try {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .single();

        const userIsAdmin =
          roleData?.role === "admin" || roleData?.role === "super_admin";
        return userIsAdmin;
      } catch (err) {
        console.error("Error checking admin status:", err);
        return false;
      }
    },
    [supabase]
  );

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
              let isAdmin = false;
              if (requireAdmin) {
                isAdmin = await checkAdminStatus(retrySession.user.id);
              }
              updateAuthState({
                user: retrySession.user,
                session: retrySession,
                isAdmin,
                loading: false,
                initialised: true,
                error: null,
              });
            }
          }, 100);
          return;
        }

        if (session?.user) {
          // Check admin status if needed
          let isAdmin = false;
          if (requireAdmin) {
            isAdmin = await checkAdminStatus(session.user.id);
            if (!isAdmin && mounted) {
              router.push("/403");
              return;
            }
          }

          if (mounted) {
            updateAuthState({
              user: session.user,
              session,
              isAdmin,
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
              isAdmin: false,
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

          console.log("Auth state change:", event, session?.user?.email);

          if (event === "SIGNED_IN" && session) {
            let isAdmin = false;
            if (session.user) {
              isAdmin = await checkAdminStatus(session.user.id);
            }

            updateAuthState({
              user: session.user,
              session,
              isAdmin,
              error: null,
            });
          } else if (event === "SIGNED_OUT") {
            updateAuthState({
              user: null,
              session: null,
              isAdmin: false,
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
  }, [
    supabase,
    router,
    requireAuth,
    requireAdmin,
    checkAdminStatus,
    updateAuthState,
    searchParams,
  ]);

  // Auth state management
  const signOut = async () => {
    try {
      // Clear state FIRST for instant UI update
      updateAuthState({
        user: null,
        session: null,
        isAdmin: false,
        loading: false,
        error: null,
      });

      // Clear saved form data
      //localStorage.removeItem("statementDraft");
      //localStorage.removeItem("statementDraftSaved");

      // Navigate immediately (no more hang!)
      router.push("/");

      // Then clean up in background
      supabase.auth.signOut().catch((error) => {
        console.error("Background signout error:", error);
        // Don't update state here - user is already "logged out" in UI
      });
    } catch (error) {
      console.error("Sign out error:", error);
      // Only show error if something goes wrong with navigation
      updateAuthState({
        error: error instanceof Error ? error.message : "Sign out failed",
        loading: false,
      });
    }
  };

  // Refresh auth state (for example, if admin changes)
  const refreshAuth = async () => {
    try {
      updateAuthState({ loading: true });

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) throw error;

      if (session?.user) {
        let isAdmin = false;
        if (requireAdmin) {
          isAdmin = await checkAdminStatus(session.user.id);
        }

        updateAuthState({
          user: session.user,
          session,
          isAdmin,
          loading: false,
          error: null,
        });
      } else {
        updateAuthState({
          user: null,
          session: null,
          isAdmin: false,
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
