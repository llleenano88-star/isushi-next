import type { Config } from 'tailwindcss';
export default {
  darkMode: ['selector', '.dark-theme'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: { extend: {
    fontFamily: { sans: ['var(--font-montserrat)', 'system-ui', 'sans-serif'], display: ['var(--font-display)', 'Impact', 'sans-serif'] },
    colors: { bg: 'var(--bg)', card: 'var(--card)', ink: 'var(--ink)', mute: 'var(--mute)', accent: 'var(--accent)', wine: '#650a2b', blush: 'var(--blush)' },
    backgroundImage: { brand: 'linear-gradient(135deg,#7d1136,#5a0a26)' },
    boxShadow: { soft: '0 1px 2px rgba(60,10,30,.05), 0 8px 24px rgba(60,10,30,.08)' },
    transitionTimingFunction: { spring: 'cubic-bezier(0.34,1.56,0.64,1)' },
  } },
} satisfies Config;
