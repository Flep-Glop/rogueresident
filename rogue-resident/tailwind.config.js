/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'pixel': ['VT323', 'monospace'],
        'pixel-heading': ['"Press Start 2P"', 'monospace'],
        'sans': ['var(--font-geist-sans)', 'Arial', 'sans-serif'],
        'mono': ['var(--font-geist-mono)', 'monospace'],
      },
      colors: {
        // Dark theme base colors
        background: '#191c21',
        surface: '#242830',
        'surface-dark': '#1a1e24',
        border: '#353b47',
        'text-primary': '#c8d2e0',
        'text-secondary': '#8892a3',
        
        // Game-specific accent colors (muted versions)
        'clinical': {
          DEFAULT: '#4e83bd',
          dark: '#3a6590',
          light: '#63a0db',
        },
        'qa': {
          DEFAULT: '#5a6978',
          dark: '#464e59',
          light: '#6d7c8a',
        },
        'educational': {
          DEFAULT: '#2c9287',
          dark: '#1f6e66',
          light: '#3db3a6',
        },
        'storage': {
          DEFAULT: '#bfb38b',
          dark: '#a59970',
          light: '#d8cca3',
        },
        'vendor': {
          DEFAULT: '#323f4f',
          dark: '#25303d',
          light: '#3e4e61',
        },
        'boss': {
          DEFAULT: '#cc4d4d',
          dark: '#a33c3c',
          light: '#e05e5e',
        },
        
        // Feedback colors
        success: '#4e9e6a',
        warning: '#d6b740',
        danger: '#cc4d4d',
        
        // Other useful shades
        'dark-gray': '#161a1f',
        'medium-gray': '#353b47',
        'light-gray': '#8892a3',
      },
      // Add custom shadows for pixel art
      boxShadow: {
        'pixel': '0 0 0 1px rgba(0, 0, 0, 0.8), inset 0 0 0 1px rgba(255, 255, 255, 0.08)',
        'pixel-md': '0 0 0 2px rgba(0, 0, 0, 0.8), inset 0 0 0 1px rgba(255, 255, 255, 0.08)',
        'pixel-lg': '0 0 0 3px rgba(0, 0, 0, 0.8), inset 0 0 0 1px rgba(255, 255, 255, 0.08)',
        'pixel-inner': 'inset 0 0 0 1px rgba(0, 0, 0, 0.8)',
        'pixel-none': 'none',
        'pixel-button': 'inset -2px -2px 0 #353b47, inset 2px 2px 0 rgba(255, 255, 255, 0.1)',
        'pixel-button-pressed': 'inset 2px 2px 0 #353b47, inset -2px -2px 0 rgba(255, 255, 255, 0.05)',
      },
      // Pixel-specific border styles
      borderWidth: {
        'pixel': '1px',
        'pixel-2': '2px',
      },
      // Add custom pixel animations
      keyframes: {
        'pixel-pulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
        'scanline': {
          '0%': { transform: 'translateY(0%)' },
          '100%': { transform: 'translateY(120%)' },
        },
        'crt-flicker': {
          '0%': { opacity: '0.97' },
          '10%': { opacity: '0.98' },
          '20%': { opacity: '0.97' },
          '50%': { opacity: '1' },
          '80%': { opacity: '0.98' },
          '90%': { opacity: '0.96' },
          '100%': { opacity: '0.98' },
        }
      },
      animation: {
        'pixel-pulse': 'pixel-pulse 2s ease-in-out infinite',
        'scanline': 'scanline 8s linear infinite',
        'crt-flicker': 'crt-flicker 0.15s infinite alternate',
      },
      // Pixel-specific sizing
      spacing: {
        'pixel': '1px',
        'pixel-2': '2px',
        'pixel-4': '4px',
        'pixel-8': '8px',
      },
    },
  },
  plugins: [],
}