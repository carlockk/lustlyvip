'use client';

import { SessionProvider } from 'next-auth/react';
import { useEffect } from 'react';
import { LanguageProvider } from '@/lib/i18n';

function initTheme() {
  try {
    const legacyKey = 'lustly_theme';
    const stored = localStorage.getItem('theme') || localStorage.getItem(legacyKey);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = stored === 'light' || stored === 'dark' ? stored : prefersDark ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
    localStorage.setItem(legacyKey, theme);
    document.documentElement.dataset.theme = theme;
    if (document.body) document.body.dataset.theme = theme;
    document.documentElement.classList.toggle('dark', theme === 'dark');
  } catch {
    document.documentElement.dataset.theme = 'dark';
    if (document.body) document.body.dataset.theme = 'dark';
    document.documentElement.classList.add('dark');
  }
}

export default function Providers({ children }) {
  useEffect(() => {
    initTheme();
  }, []);

  return (
    <SessionProvider>
      <LanguageProvider>
        {children}
      </LanguageProvider>
    </SessionProvider>
  );
}
