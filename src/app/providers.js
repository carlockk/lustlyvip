'use client';

import { SessionProvider } from 'next-auth/react';
import { useEffect } from 'react';
import { LanguageProvider } from '@/lib/i18n';

function initTheme() {
  try {
    const stored = localStorage.getItem('theme');
    let theme = stored;
    if (!theme) {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      theme = prefersDark ? 'dark' : 'light';
    }
    document.documentElement.dataset.theme = theme;
    document.body.dataset.theme = theme;
  } catch {
    // fallback a oscuro existente
    document.documentElement.dataset.theme = 'dark';
    document.body.dataset.theme = 'dark';
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
