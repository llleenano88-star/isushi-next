import type { Config } from 'tailwindcss';
export default {
  darkMode: ['selector', '.dark-theme'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: { extend: {
    fontFamily: { sans: ['var(--font-montserrat)', 'system-ui', 'sans-serif'] },
    colors: { bg: 'var(--bg)', card: 'var(--card)', ink: 'var(--ink)', mute: 'var(--mute)' },
    backgroundImage: { brand: 'linear-gradient(135deg,#ff8a2b,#ffad26 55%,#ffd166)' },
    boxShadow: {
      soft: '0 1px 2px rgba(0,0,0,.04), 0 6px 16px rgba(0,0,0,.06), 0 18px 40px rgba(255,138,43,.08)',
    },
    transitionTimingFunction: { spring: 'cubic-bezier(0.34,1.56,0.64,1)' },
  } },
} satisfies Config;
