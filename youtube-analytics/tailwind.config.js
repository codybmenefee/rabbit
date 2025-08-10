/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'glass': {
          'bg': 'rgba(0, 0, 0, 0.4)',
          'border': 'rgba(255, 255, 255, 0.05)',
          'border-hover': 'rgba(255, 255, 255, 0.08)',
          'subtle': 'rgba(255, 255, 255, 0.02)',
          'subtle-hover': 'rgba(255, 255, 255, 0.05)',
        },
        'gradient': {
          'purple-start': '#8B5CF6',
          'purple-mid': '#A855F7',
          'pink-end': '#EC4899',
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