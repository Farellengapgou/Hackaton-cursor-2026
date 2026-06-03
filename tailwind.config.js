import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#1D9E75',
        'primary-dark': '#168a65',
        background: '#0F2027',
        'background-light': '#162b34',
        'background-panel': '#1a323c',
        accent: '#F5A623',
        danger: '#E74C3C',
        muted: '#8ba3ad',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'gauge-fill': 'gaugeFill 1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'slide-up': 'slideUp 0.35s ease-out forwards',
      },
      keyframes: {
        gaugeFill: {
          '0%': { strokeDashoffset: '283' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      boxShadow: {
        glow: '0 0 24px rgba(29, 158, 117, 0.25)',
        'glow-accent': '0 0 24px rgba(245, 166, 35, 0.3)',
        panel: '0 4px 24px rgba(0, 0, 0, 0.35)',
      },
    },
  },
  plugins: [typography],
};
