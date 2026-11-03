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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function autoReload(reason) {
                  try {
                    var lastRetry = sessionStorage.getItem('chunk_recovery_ts');
                    var now = Date.now();
                    // Throttle reload to at most once every 4 seconds to eliminate loops
                    if (!lastRetry || (now - parseInt(lastRetry, 10)) > 4000) {
                      sessionStorage.setItem('chunk_recovery_ts', now.toString());
                      console.warn('[Next.js Auto-Recovery] Static asset failed to load (' + reason + '). Recovering fresh assets...');
                      window.location.reload();
                    }
                  } catch (e) {
                    window.location.reload();
                  }
                }

                // 1. Capture element load failures on <link rel="stylesheet"> and <script> (CSS/JS 404s)
                window.addEventListener('error', function(e) {
                  var target = e.target;
                  if (target && (target.tagName === 'LINK' || target.tagName === 'SCRIPT')) {
                    var src = target.src || target.href || '';
                    if (src.indexOf('/_next/static/') !== -1) {
                      autoReload('Asset 404: ' + src.split('?')[0]);
                    }
                  } else {
                    var msg = (e.error && (e.error.message || e.error.toString())) || (e.message || '');
                    if (msg.indexOf('Loading chunk') !== -1 || msg.indexOf('ChunkLoadError') !== -1) {
                      autoReload('Dynamic Chunk Error');
                    }
                  }
                }, true); // useCapture = true captures non-bubbling link/script error events

                // 2. Unhandled promise rejections (dynamic imports)
                window.addEventListener('unhandledrejection', function(e) {
                  var msg = (e.reason && (e.reason.message || e.reason.toString())) || '';
                  if (msg.indexOf('Loading chunk') !== -1 || msg.indexOf('ChunkLoadError') !== -1) {
                    autoReload('Promise Chunk Error');
                  }
                });

                // 3. Clear retry timestamp after successful window load and hydration
                window.addEventListener('load', function() {
                  setTimeout(function() {
                    try { sessionStorage.removeItem('chunk_recovery_ts'); } catch (e) {}
                  }, 2500);
                });
              })();
            `,
          }}
        />
      </head>
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
