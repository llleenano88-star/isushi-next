import type { Config } from 'tailwindcss';
export default {
  darkMode: ['selector', '.dark-theme'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: { extend: {
    fontFamily: { sans: ['var(--font-montserrat)', 'system-ui', 'sans-serif'], display: ['var(--font-montserrat)', 'system-ui', 'sans-serif'] },
    colors: { bg: 'var(--bg)', card: 'var(--card)', ink: 'var(--ink)', mute: 'var(--mute)', accent: 'var(--accent)', blush: 'var(--blush)', leaf: 'var(--leaf)', sage: 'var(--sage)', wine: '#245622' },
    backgroundImage: { brand: 'linear-gradient(135deg,#34762f,#245622)' },
    boxShadow: { soft: '0 1px 2px rgba(20,50,20,.05), 0 8px 24px rgba(20,50,20,.08)' },
    transitionTimingFunction: { spring: 'cubic-bezier(0.34,1.56,0.64,1)' },
  } },
} satisfies Config;
