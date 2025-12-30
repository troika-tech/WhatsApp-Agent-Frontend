/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e3f2fd',
          100: '#bbdefb',
          200: '#90caf9',
          300: '#64b5f6',
          400: '#42a5f5',
          500: '#2196F3',
          600: '#1e88e5',
          700: '#1976d2',
          800: '#1565c0',
          900: '#0d47a1',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', 'system-ui', 'sans-serif'],
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: '#374151',
            h2: {
              color: '#0f172a',
              fontWeight: '700',
              fontSize: '1.125rem',
              marginTop: '1.75rem',
              marginBottom: '1rem',
              paddingBottom: '0.5rem',
              borderBottom: '2px solid #e5e7eb',
            },
            'h2:first-child': {
              marginTop: '0',
            },
            ul: {
              marginTop: '0.75rem',
              marginBottom: '1rem',
              listStyleType: 'disc',
              paddingLeft: '1.5rem',
            },
            li: {
              marginTop: '0.5rem',
              marginBottom: '0.5rem',
              paddingLeft: '0.25rem',
              color: '#4b5563',
              lineHeight: '1.6',
            },
            'li::marker': {
              color: '#10b981',
              fontWeight: '600',
            },
            p: {
              marginTop: '0.75rem',
              marginBottom: '0.75rem',
              lineHeight: '1.7',
            },
            strong: {
              color: '#1f2937',
              fontWeight: '700',
            },
            em: {
              fontStyle: 'italic',
              color: '#374151',
            },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}

