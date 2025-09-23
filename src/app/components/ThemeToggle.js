'use client';

import { useEffect, useState } from 'react';
import { MdLightMode, MdDarkMode } from 'react-icons/md';

export default function ThemeToggle({ compact = true }) {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('theme');
      if (stored === 'light' || stored === 'dark') {
        setTheme(stored);
      } else {
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(prefersDark ? 'dark' : 'light');
      }
    } catch {}
  }, []);

  const apply = (t) => {
    setTheme(t);
    try { localStorage.setItem('theme', t); } catch {}
    document.documentElement.dataset.theme = t;
    document.body.dataset.theme = t;
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: t } }));
  };

  const toggle = () => apply(theme === 'dark' ? 'light' : 'dark');
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggle}
      title={isDark ? 'Light' : 'Dark'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`w-9 h-9 rounded-full flex items-center justify-center border ${isDark ? 'bg-gray-700 text-gray-200 hover:bg-gray-600 border-gray-600' : 'bg-pink-600 text-white border-transparent'} cursor-pointer`}
    >
      {isDark ? <MdLightMode /> : <MdDarkMode />}
    </button>
  );
}
