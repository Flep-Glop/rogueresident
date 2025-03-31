import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import PixelThemeProvider from "./components/PixelThemeProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rogue Resident: Medical Physics Residency",
  description: "An educational roguelike game about medical physics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PixelThemeProvider>
          {children}
        </PixelThemeProvider>
      </body>
    </html>
  );
}