/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Inter"',
          'system-ui',
          '-apple-system',
          '"Segoe UI"',
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          '"Microsoft YaHei"',
          'sans-serif'
        ]
      },
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81'
        }
      },
      boxShadow: {
        panel: '0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.06)',
        float: '0 12px 40px rgba(15, 23, 42, 0.18)'
      },
      animation: {
        'fade-in': 'fadeIn 160ms ease-out',
        'slide-up': 'slideUp 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-right': 'slideRight 220ms cubic-bezier(0.16, 1, 0.3, 1)'
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(12px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' }
        },
        slideRight: {
          from: { opacity: '0', transform: 'translateX(24px)' },
          to: { opacity: '1', transform: 'translateX(0)' }
        }
      }
    }
  },
  plugins: []
}
