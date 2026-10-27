import type { Config } from 'tailwindcss';
export default {
  darkMode: ['selector', '.dark-theme'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: { extend: {
    fontFamily: { sans: ['var(--font-montserrat)', 'system-ui', 'sans-serif'], display: ['var(--font-montserrat)', 'system-ui', 'sans-serif'] },
    colors: { bg: 'var(--bg)', card: 'var(--card)', ink: 'var(--ink)', mute: 'var(--mute)', accent: 'var(--accent)', blush: 'var(--blush)', leaf: 'var(--leaf)', sage: 'var(--sage)', wine: '#c2185b' },
    backgroundImage: { brand: 'linear-gradient(135deg,#ee3f9a,#d11a76)' },
    boxShadow: { soft: '0 1px 2px rgba(60,20,40,.05), 0 8px 24px rgba(60,20,40,.08)' },
    transitionTimingFunction: { spring: 'cubic-bezier(0.34,1.56,0.64,1)' },
  } },
} satisfies Config;
