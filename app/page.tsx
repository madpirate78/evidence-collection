"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "../contexts/AuthContext";

// ⚠️ DEVELOPMENT ONLY - DO NOT USE IN PRODUCTION ⚠️
// Replace these with your test account credentials
const DEV_EMAIL = "test@example.com";
const DEV_PASSWORD = "cmsevidence";

export default function Home() {
  const [isReady, setIsReady] = useState(false);
  const { user, loading: authLoading, initialised } = useAuth();
  const supabase = createClient();
  const loginAttempted = useRef(false);

  useEffect(() => {
    if (!initialised || loginAttempted.current) return;

    const performAutoLogin = async () => {
      loginAttempted.current = true;

      // Check current session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        // No session, perform auto-login
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: DEV_EMAIL,
            password: DEV_PASSWORD,
          });

          if (error) {
            console.error("Auto-login failed:", error);
            alert(
              `Dev auto-login failed: ${error.message}\n\nPlease check DEV_EMAIL and DEV_PASSWORD in app/page.tsx`
            );
          } else {
            console.log("Auto-login successful:", data.user?.email);
          }
        } catch (err) {
          console.error("Auto-login error:", err);
        }
      }

      // Show page regardless of login result
      setIsReady(true);
    };

    performAutoLogin();
  }, [initialised, supabase]);

  // Simple loading screen while setting up
  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Setting up development environment...</p>
        </div>
      </div>
    );
  }

  // Regular page content
  return (
    <div>
      {/* Dev mode indicator */}
      <div className="bg-amber-500 text-white p-1 text-center text-xs">
        DEV MODE - Auto-login enabled |{" "}
        {user ? `Logged in as ${user.email}` : "Not logged in"}
      </div>

      {/* Hero Section */}
      <div className="bg-blue-600 text-white rounded-lg shadow-xl overflow-hidden mb-12">
        <div className="max-w-5xl mx-auto px-4 py-16 md:py-20 md:px-10">
          <div className="md:w-2/3">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              Supporting Judicial Review of Child Maintenance Calculations
            </h1>
            <p className="text-lg md:text-xl mb-8 text-blue-100">
              This platform collects evidence to support ongoing judicial review
              proceedings looking at whether CMS calculations properly consider
              the welfare of children affected by maintenance arrangements.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/statement-portal"
                className="bg-white text-blue-600 hover:bg-blue-50 transition px-6 py-3 rounded-md font-semibold text-center"
              >
                Submit Your Evidence
              </Link>
              <Link
                href="/statistics"
                className="bg-blue-700 hover:bg-blue-800 transition text-white px-6 py-3 rounded-md font-semibold text-center"
              >
                View Statistics
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="mb-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
          How It Works
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
            <div className="bg-blue-100 text-blue-600 w-12 h-12 rounded-full flex items-center justify-center mb-4 font-bold text-xl">
              1
            </div>
            <h3 className="text-xl font-semibold mb-3">Create an Account</h3>
            <p className="text-gray-600">
              Sign up securely to access our evidence submission system. Your
              privacy is our priority.
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
            <div className="bg-blue-100 text-blue-600 w-12 h-12 rounded-full flex items-center justify-center mb-4 font-bold text-xl">
              2
            </div>
            <h3 className="text-xl font-semibold mb-3">Submit Your Evidence</h3>
            <p className="text-gray-600">
              Document your experiences and upload supporting statements.
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
            <div className="bg-blue-100 text-blue-600 w-12 h-12 rounded-full flex items-center justify-center mb-4 font-bold text-xl">
              3
            </div>
            <h3 className="text-xl font-semibold mb-3">Make an Impact</h3>
            <p className="text-gray-600">
              Your evidence contributes to understanding systemic issues and
              advocating for meaningful changes.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-white rounded-lg shadow-md p-8 mb-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
          Building Evidence for Change
        </h2>
        <div className="grid md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-4xl font-bold text-blue-600 mb-2">Live</div>
            <p className="text-gray-600">Evidence counter updates</p>
          </div>
          <div>
            <div className="text-4xl font-bold text-blue-600 mb-2">Secure</div>
            <p className="text-gray-600">
              Your data is protected and deletable
            </p>
          </div>
          <div>
            <div className="text-4xl font-bold text-blue-600 mb-2">Action</div>
            <p className="text-gray-600">
              Supporting judicial review proceedings
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gray-100 rounded-lg p-8 text-center">
        <h2 className="text-2xl md:text-3xl font-semibold mb-4">
          Ready to Share Your Experience?
        </h2>
        <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
          Join others in documenting CMS issues to help drive systemic change.
          Your experience matters.
        </p>
        <Link
          href="/statement-portal"
          className="bg-blue-600 hover:bg-blue-700 transition text-white px-6 py-3 rounded-md font-semibold inline-block"
        >
          Submit Your Evidence
        </Link>
      </div>
    </div>
  );
}
