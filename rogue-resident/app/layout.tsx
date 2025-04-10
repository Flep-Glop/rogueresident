import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import PixelThemeProvider from "./components/PixelThemeProvider";
import "./globals.css";

// Import the client wrapper component
import ClientDashboardWrapper from "./components/debug/ClientDashboardWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap", // Use display swap to prevent FOUT
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap", // Use display swap to prevent FOUT
});

export const metadata: Metadata = {
  title: "Rogue Resident: Medical Physics Residency",
  description: "An educational roguelike game about medical physics",
};

// Static font preloading in the document head
function FontPreloader() {
  return (
    <>
      {/* Font Preloading */}
      <link 
        rel="preload" 
        href="https://fonts.googleapis.com/css2?family=VT323&display=swap" 
        as="style"
        crossOrigin="anonymous"
      />
      <link 
        rel="preload" 
        href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" 
        as="style"
        crossOrigin="anonymous"
      />
      {/* Also preload the actual font files */}
      <link 
        rel="preload" 
        href="https://fonts.gstatic.com/s/vt323/v17/pxiKyp0ihIEF2isfFJU.woff2" 
        as="font"
        type="font/woff2"
        crossOrigin="anonymous"
      />
      <link 
        rel="preload" 
        href="https://fonts.gstatic.com/s/pressstart2p/v15/e3t4euO8T-267oIAQAu6jDQyK3nVivM.woff2" 
        as="font"
        type="font/woff2"
        crossOrigin="anonymous"
      />
      {/* Add stylesheet links to ensure they load immediately */}
      <link 
        rel="stylesheet" 
        href="https://fonts.googleapis.com/css2?family=VT323&display=swap" 
      />
      <link 
        rel="stylesheet" 
        href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" 
      />
    </>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Determine if we're in development mode
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  return (
    <html lang="en">
      <head>
        <FontPreloader />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PixelThemeProvider>
          {/* Note: Systems initialization happens in the page component */}
          {children}
          
          {/* Use our client wrapper component for the dashboard */}
          {isDevelopment && <ClientDashboardWrapper />}
        </PixelThemeProvider>
        
        {/* Development-only script tag - this is safe in server components */}
        {isDevelopment && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                // Add error monitoring for Chamber Pattern violations
                const originalError = console.error;
                console.error = function(...args) {
                  originalError.apply(console, args);
                  
                  // Check for React child errors that may indicate Chamber Pattern issues
                  const errorMsg = args.join(' ');
                  if (
                    errorMsg.includes('Objects are not valid as a React child') || 
                    errorMsg.includes('getSnapshot should be cached')
                  ) {
                    console.warn(
                      '%c[ChamberPattern] Potential Chamber Pattern violation detected!', 
                      'color: #ef4444; font-weight: bold'
                    );
                    console.warn(
                      'Tip: Use usePrimitiveStoreValue to extract primitives instead of objects'
                    );
                  }
                };
              `
            }}
          />
        )}
      </body>
    </html>
  );
}