/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'mono': ['JetBrains Mono', 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Consolas', 'monospace'],
        'display': ['Inter', 'system-ui', 'sans-serif'],
        'body': ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        'terminal': {
          'bg': '#0a0a0a',
          'surface': '#111111',
          'border': '#1a1a1a',
          'text': '#e5e5e5',
          'muted': '#888888',
        },
        'signal': {
          'green': {
            50: '#f0fff4',
            100: '#c6f6d5',
            200: '#9ae6b4',
            300: '#68d391',
            400: '#48bb78',
            500: '#38a169',
            600: '#2f855a',
            700: '#276749',
            800: '#22543d',
            900: '#1a202c',
          },
          'orange': {
            50: '#fffbf0',
            100: '#fef5e7',
            200: '#feebc8',
            300: '#fbd38d',
            400: '#f6ad55',
            500: '#ed8936',
            600: '#dd6b20',
            700: '#c05621',
            800: '#9c4221',
            900: '#7b341e',
          },
          'red': {
            50: '#fff5f5',
            100: '#fed7d7',
            200: '#feb2b2',
            300: '#fc8181',
            400: '#f56565',
            500: '#e53e3e',
            600: '#c53030',
            700: '#9b2c2c',
            800: '#822727',
            900: '#63171b',
          }
        }
      },
      backdropBlur: {
        'glass': '12px',
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0, 0, 0, 0.24)',
        'glass-hover': '0 12px 40px rgba(0, 0, 0, 0.32)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.4s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}