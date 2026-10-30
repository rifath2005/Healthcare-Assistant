import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import { ToasterProvider } from "@/components/ui/ToasterProvider";

export const viewport: Viewport = {
  themeColor: "#10b981",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "Smart Healthcare Assistant | Conversational Wellness & Triage",
  description:
    "An intelligent, voice-enabled conversational healthcare companion delivering grounded medical guidance, real-time symptom analysis, empathetic mental health support, and automated doctor scheduling.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Smart Healthcare Assistant",
    description: "AI-powered grounded wellness guidance and doctor scheduling.",
    type: "website",
    locale: "en_US",
    siteName: "Smart Healthcare Assistant",
  },
  twitter: {
    card: "summary_large_image",
    title: "Smart Healthcare Assistant",
    description: "AI-powered grounded wellness guidance and doctor scheduling.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <ToasterProvider />
        </ThemeProvider>
      </body>
    </html>
  );
}
