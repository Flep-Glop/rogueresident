/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./app/**/*.{js,ts,jsx,tsx}",
      "./pages/**/*.{js,ts,jsx,tsx}",
      "./components/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          // Dark theme base colors
          background: '#1A1E26',
          surface: '#262B36',
          border: '#3A4055',
          'text-primary': '#E0E2E8',
          'text-secondary': '#A0A8B8',
          
          // Game-specific accent colors (from your design doc)
          'clinical': {
            DEFAULT: '#4A90E2',
            dark: '#3A7BC9',
            light: '#6BA5E9',
          },
          'qa': {
            DEFAULT: '#5A6978',
            dark: '#485460',
            light: '#6B7A89',
          },
          'educational': {
            DEFAULT: '#26A69A',
            dark: '#1D8C82',
            light: '#39B9AD',
          },
          'storage': {
            DEFAULT: '#D8CCA3',
            dark: '#BDB387',
            light: '#E4DAB9',
          },
          'vendor': {
            DEFAULT: '#2C3E50',
            dark: '#1E2A36',
            light: '#3A5269',
          },
          
          // Feedback colors
          success: '#48BB78',
          warning: '#F4D03F',
          danger: '#E53E3E',
          
          // Other useful shades
          'dark-gray': '#121520',
          'medium-gray': '#3A4055',
          'light-gray': '#A0A8B8',
        },
        // Add custom shadows for depth
        boxShadow: {
          'card': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
          'active': '0 0 0 2px rgba(74, 144, 226, 0.6), 0 4px 8px rgba(0, 0, 0, 0.4)',
        }
      },
    },
    plugins: [],
  }