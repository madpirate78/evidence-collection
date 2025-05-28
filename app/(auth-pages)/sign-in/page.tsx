// app/(auth-pages)/sign-in/page.tsx - With form validation
import { signInAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { CSRFTokenInput } from "@/components/csrf-token";

export default async function SignInPage(props: {
  searchParams: Promise<Message & { redirectTo?: string }>;
}) {
  const searchParams = await props.searchParams;

  // Check if it's a CSRF error
  const isCSRFError =
    "error" in searchParams &&
    searchParams.error ===
      "Invalid security token. Please refresh and try again.";

  return (
    <div className="flex-1 flex flex-col items-center justify-center">
      <div className="w-full max-w-md">
        <form className="bg-white rounded-lg shadow-md p-8" noValidate>
          <CSRFTokenInput />

          <h1 className="text-2xl font-bold mb-2">Sign in</h1>
          <p className="text-sm text-gray-600 mb-6">
            Don't have an account?{" "}
            <Link
              className="text-blue-600 font-medium hover:underline"
              href="/sign-up"
            >
              Sign up
            </Link>
          </p>

          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                className="mt-1"
                autoComplete="email"
                aria-describedby="email-error"
              />
              <div
                id="email-error"
                role="alert"
                className="text-red-600 text-sm mt-1"
              >
                {/* Client-side validation messages will appear here */}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <Label htmlFor="password">Password *</Label>
                <Link
                  className="text-xs text-blue-600 hover:underline"
                  href="/forgot-password"
                >
                  Forgot Password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                name="password"
                placeholder="Your password"
                required
                minLength={1}
                autoComplete="current-password"
                aria-describedby="password-error"
              />
              <div
                id="password-error"
                role="alert"
                className="text-red-600 text-sm mt-1"
              >
                {/* Client-side validation messages will appear here */}
              </div>
            </div>

            {/* Hidden field for redirect */}
            {searchParams?.redirectTo && (
              <input
                type="hidden"
                name="redirectTo"
                value={searchParams.redirectTo}
              />
            )}

            <SubmitButton
              pendingText="Signing in..."
              formAction={signInAction}
              className="w-full"
            >
              Sign in
            </SubmitButton>

            {/* Only show error if it's not a CSRF error */}
            {!isCSRFError && <FormMessage message={searchParams} />}
          </div>
        </form>

        <div className="mt-4 text-center text-sm text-gray-600">
          <p>
            By signing in, you agree to our{" "}
            <Link href="/terms" className="text-blue-600 hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-blue-600 hover:underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
