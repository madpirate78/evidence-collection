import "./globals.css";
import { Metadata } from "next";
import { Inter, Oswald } from 'next/font/google'
import TestModeIndicator from '../components/TestModeIndicator'
import ClientLayout from "./ClientLayout"

const inter = Inter({ subsets: ['latin'] })
const oswald = Oswald({ 
  subsets: ['latin'],
  weight: ['700'],
  variable: '--font-oswald'
})


export const metadata: Metadata = {
  title: "CMS Policy Research",
  description:
    "Anonymous data collection researching child maintenance policy experiences",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32", type: "image/x-icon" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if we're in test mode - LOCAL DEVELOPMENT ONLY
  // Railway will never have DEPLOYMENT_MODE=test, only local dev
  const isTestMode = process.env.NODE_ENV === 'development' && process.env.DEPLOYMENT_MODE === 'test'
  
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.className} ${oswald.variable} bg-gray-50 min-h-screen flex flex-col`}
        suppressHydrationWarning
      >
        <TestModeIndicator isTestMode={isTestMode} />
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
