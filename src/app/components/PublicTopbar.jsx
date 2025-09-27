'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '@/lib/i18n';
import LanguageToggle from './LanguageToggle';

const STORAGE_KEY = 'theme';
const LEGACY_KEY = 'lustly_theme';

export default function PublicTopbar({ showLoginButton = true, fullWidth = false, showThemeToggle = true, showPoliticsLink = false, onPoliticsClick = null }) {
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
    <header className="sticky top-0 z-30 w-full border-b border-gray-800 bg-[#101828]/80 backdrop-blur supports-[backdrop-filter]:backdrop-blur">
      <div
        className={`${
          fullWidth
            ? 'w-full px-6 md:px-10 h-14 flex items-center justify-between'
            : 'mx-auto max-w-6xl px-4 h-14 flex items-center justify-between'
        }`}
      >
        <div className="flex items-center gap-3">
          <Link href="/" className="inline-flex items-center gap-2">
            <img src="/images/logo.png" alt="Lustly" className="h-8 w-auto app-logo" />
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          {showPoliticsLink && (
            onPoliticsClick ? (
              <button
                type="button"
                onClick={onPoliticsClick}
                className="inline-flex items-center px-3 py-1.5 rounded border border-gray-700 text-white hover:bg-gray-800 text-sm transition-colors"
              >
                {t('servicePolicies') || 'Políticas del servicio'}
              </button>
            ) : (
              <Link
                href="/politics"
                className="inline-flex items-center px-3 py-1.5 rounded border border-gray-700 text-white hover:bg-gray-800 text-sm transition-colors"
              >
                {t('servicePolicies') || 'Políticas del servicio'}
              </Link>
            )
          )}
          {showLoginButton && (
            <Link
              href="/auth/login"
              className="inline-flex items-center px-3 py-1.5 rounded bg-pink-600 hover:bg-pink-700 text-white text-sm font-semibold transition-colors"
            >
              {t('loginCta') || 'Iniciar Sesión'}
            </Link>
          )}
          {showThemeToggle && (
            <button
              type="button"
              onClick={toggleTheme}
              className="px-3 py-1.5 rounded border border-gray-700 hover:bg-gray-800 text-sm text-white transition-colors"
              title={t('switchTheme') || 'Cambiar tema'}
            >
              {theme === 'dark'
                ? `${t('lightMode') || 'Modo claro'}`
                : `${t('darkMode') || 'Modo oscuro'}`
              }
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
