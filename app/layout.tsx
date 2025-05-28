import "./globals.css";
import ClientLayout from "./ClientLayout";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "CMS Evidence Collection",
  description: "Document CMS Issues",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="bg-gray-50 min-h-screen flex flex-col"
        suppressHydrationWarning
      >
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
