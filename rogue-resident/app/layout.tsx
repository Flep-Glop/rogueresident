import './globals.css';
import type { Metadata, Viewport } from 'next';
import PixelThemeProvider from './components/PixelThemeProvider';
import FontPreLoader from './components/FontPreLoader';
import { Inter } from 'next/font/google';
import ClientBuildInfo from './components/debug/ClientBuildInfo';

// Optional: Using the Next.js built-in font system
const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

// Fixed: Move viewport-related settings to the viewport export
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#000000',
  colorScheme: 'dark'
};

export const metadata: Metadata = {
  title: 'Rogue Resident: Vertical Slice',
  description: 'Medical physics education through roguelike gameplay',
  keywords: ['medical physics', 'education', 'game', 'roguelike'],
  authors: [{ name: 'Rogue Resident Team' }],
  robots: 'index, follow',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <head>
        {/* Using non-blocking font loading with correct crossOrigin attributes */}
        <link
          rel="preconnect" 
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect" 
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=VT323&display=swap"
          rel="stylesheet"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap"
          rel="stylesheet"
          crossOrigin="anonymous"
        />
      </head>
      <body className="bg-black text-white antialiased">
        <PixelThemeProvider>
          {/* FontPreLoader is a client component that doesn't render anything visible */}
          <FontPreLoader />
          
          {/* Main content */}
          <main>
            {children}
          </main>
          
          {/* Development debug component - imported directly as a client component */}
          {process.env.NODE_ENV === 'development' && <ClientBuildInfo />}
        </PixelThemeProvider>
      </body>
    </html>
  );
}