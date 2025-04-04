import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import PixelThemeProvider from "./components/PixelThemeProvider";
import { GameEffectsProvider } from "./components/GameEffects";
import "./globals.css";
import "./styles/map-visibility-fix.css"; // Add our visibility fixes
import FontLoadingContainer from "./components/FontLoadingContainer";

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
          {/* Wrap with GameEffectsProvider to make effects available throughout the app */}
          <GameEffectsProvider>
            {/* In development, wrap with DebugWrapper to enable testing tools */}
            {isDevelopment ? (
                <FontLoadingContainer>
                  {children}
                </FontLoadingContainer>
            ) : (
              <FontLoadingContainer>
                {children}
              </FontLoadingContainer>
            )}
          </GameEffectsProvider>
        </PixelThemeProvider>
      </body>
    </html>
  );
}