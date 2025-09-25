'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '@/lib/i18n';
import LanguageToggle from './LanguageToggle';

const STORAGE_KEY = 'theme';
const LEGACY_KEY = 'lustly_theme';

export default function PublicTopbar() {
  const { t } = useLanguage();
  const [theme, setTheme] = useState('dark');

  const syncTheme = useCallback((value) => {
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
      syncTheme(initial);
    } catch {
      setTheme('dark');
      syncTheme('dark');
    }
  }, [syncTheme]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
      localStorage.setItem(LEGACY_KEY, next);
    } catch {}
    syncTheme(next);
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-gray-800 bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-lg font-bold tracking-wide">Lustly</Link>
          <nav className="hidden sm:flex items-center gap-2 text-sm">
            <Link href="/" className="px-3 py-1.5 rounded hover:bg-gray-800">
              {t('home') || 'Inicio'}
            </Link>
            <Link href="/auth/login" className="px-3 py-1.5 rounded bg-pink-600 hover:bg-pink-700 text-white">
              {t('loginCta') || 'Iniciar Sesión'}
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <button
            type="button"
            onClick={toggleTheme}
            className="px-3 py-1.5 rounded border border-gray-700 hover:bg-gray-800 text-sm"
            title={t('switchTheme') || 'Cambiar tema'}
          >
            {theme === 'dark'
              ? `☀️ ${t('lightMode') || 'Modo claro'}`
              : `🌙 ${t('darkMode') || 'Modo oscuro'}`}
          </button>
        </div>
      </div>
    </header>
  );
}
