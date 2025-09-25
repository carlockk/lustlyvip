'use client';

import { useEffect, useState, useCallback } from 'react';
import { MdLightMode, MdDarkMode } from 'react-icons/md';
import { useLanguage } from '@/lib/i18n';

const STORAGE_KEY = 'theme';
const LEGACY_KEY = 'lustly_theme';

export default function ThemeToggle({ compact = true }) {
  const { t } = useLanguage();
  const [theme, setTheme] = useState('dark');

  const syncDocumentTheme = useCallback((value) => {
    if (!value) return;
    document.documentElement.dataset.theme = value;
    if (document.body) document.body.dataset.theme = value;
    document.documentElement.classList.toggle('dark', value === 'dark');
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: value } }));
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_KEY);
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initial = stored === 'light' || stored === 'dark' ? stored : prefersDark ? 'dark' : 'light';
      setTheme(initial);
      syncDocumentTheme(initial);
    } catch {
      setTheme('dark');
      syncDocumentTheme('dark');
    }
    const listener = (event) => {
      const nextTheme = event?.detail?.theme;
      if (nextTheme === 'light' || nextTheme === 'dark') {
        setTheme(nextTheme);
      }
    };
    window.addEventListener('themechange', listener);
    return () => {
      window.removeEventListener('themechange', listener);
    };
  }, [syncDocumentTheme]);

  const apply = (value) => {
    setTheme(value);
    try {
      localStorage.setItem(STORAGE_KEY, value);
      localStorage.setItem(LEGACY_KEY, value);
    } catch {}
    syncDocumentTheme(value);
  };

  const toggle = () => apply(theme === 'dark' ? 'light' : 'dark');
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggle}
      title={isDark ? (t('lightMode') || 'Modo claro') : (t('darkMode') || 'Modo oscuro')}
      aria-label={t('switchTheme') || 'Cambiar tema'}
      className={`w-9 h-9 rounded-full flex items-center justify-center border ${
        isDark
          ? 'bg-gray-700 text-gray-200 hover:bg-gray-600 border-gray-600'
          : 'bg-pink-600 text-white border-transparent hover:bg-pink-500'
      } cursor-pointer`}
    >
      {isDark ? <MdLightMode /> : <MdDarkMode />}
    </button>
  );
}
