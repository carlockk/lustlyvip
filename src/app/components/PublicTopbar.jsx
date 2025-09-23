'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function PublicTopbar() {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    // lee tema guardado o media query
    try {
      const saved = localStorage.getItem('lustly_theme');
      const prefDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
      const initial = saved || (prefDark ? 'dark' : 'light');
      setTheme(initial);
      document.documentElement.classList.toggle('dark', initial === 'dark');
    } catch {}
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      localStorage.setItem('lustly_theme', next);
    } catch {}
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-gray-800 bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-lg font-bold tracking-wide">Lustly</Link>
          <nav className="hidden sm:flex items-center gap-2 text-sm">
            <Link href="/" className="px-3 py-1.5 rounded hover:bg-gray-800">Inicio</Link>
            <Link href="/auth/login" className="px-3 py-1.5 rounded bg-pink-600 hover:bg-pink-700 text-white">Iniciar sesión</Link>
          </nav>
        </div>
        <div className="flex items-center">
          <button
            type="button"
            onClick={toggleTheme}
            className="px-3 py-1.5 rounded border border-gray-700 hover:bg-gray-800 text-sm"
            title="Cambiar tema"
          >
            {theme === 'dark' ? '☀️ Claro' : '🌙 Oscuro'}
          </button>
        </div>
      </div>
    </header>
  );
}
