// utils/csrf-server.ts - Server-side CSRF utilities
import { cookies } from "next/headers";
import { nanoid } from "nanoid";

/**
 * Server-side CSRF token utilities
 */
export class CSRFTokenServer {
  private static TOKEN_NAME = "csrf_token";

  /**
   * Generate a new CSRF token
   */
  static generate(): string {
    return nanoid(32);
  }

  /**
   * Get CSRF token from cookies (server-side)
   */
  static async getServerToken(): Promise<string | null> {
    const cookieStore = await cookies();
    return cookieStore.get(this.TOKEN_NAME)?.value || null;
  }

  /**
   * Set CSRF token in cookies (server-side)
   */
  static async setServerToken(token: string): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.set(this.TOKEN_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });
  }

  /**
   * Verify CSRF token (server-side)
   */
  static async verify(requestToken: string | null): Promise<boolean> {
    if (!requestToken) return false;
    const serverToken = await this.getServerToken();
    return serverToken === requestToken;
  }
}
