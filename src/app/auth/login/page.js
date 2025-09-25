// src/app/auth/login/page.js
'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';
import PublicHighlights from '@/app/components/PublicHighlights';
import PublicTopbar from '@/app/components/PublicTopbar';


export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-gray-900 text-gray-200">Cargando…</div>}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const { data: session, status } = useSession();
  const { t } = useLanguage();
  const router = useRouter();
  const sp = useSearchParams();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  // destino al que volver después del login
  const callbackUrl = useMemo(() => sp?.get('callbackUrl') || '/', [sp]);

  // si ya está logueado, no mostrar login
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      router.replace(callbackUrl);
    }
  }, [status, session, callbackUrl, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setMessage(t('loggingIn'));
    setIsError(false);
    try {
      const result = await signIn('credentials', {
        redirect: false,
        email: formData.email,
        password: formData.password,
      });
      if (result?.error) {
        setMessage(t('invalidCredentials'));
        setIsError(true);
      } else {
        setMessage(t('loginSuccessRedirect'));
        setIsError(false);
        router.replace(callbackUrl);
      }
    } catch {
      setMessage(t('connectionError'));
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 text-gray-200">
        {t('loadingGeneric') || 'Cargando…'}
      </div>
    );
  }

  // imagen de fondo
  const BG = '/images/fondoinicio.jpg';
  const heroNote = t('homeHeroNote') || 'Explora avances de publicaciones públicas, descubre nuevos creadores y activa notificaciones personalizadas cuando te unas.';

  return (
    <>
      {/* Hero de login */}
      <div className="relative min-h-[85vh]">
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          <img
            src={BG}
            alt="Fondo"
            className="w-full h-full object-cover scale-105 blur-[2px]"
          />
          <div className="absolute inset-0 bg-black/65" />
        </div>

        <div className="relative z-10 flex flex-col min-h-[85vh]">
          <PublicTopbar showLoginButton={false} fullWidth />
          <div className="flex-1 flex flex-col md:flex-row">
            <div className="flex-1 flex flex-col justify-center px-8 md:px-12 lg:px-20 py-12 text-gray-100 space-y-6">
              <div className="max-w-2xl space-y-4">
                <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                  Descubre a creadores increíbles
                </h1>
                <p className="text-base lg:text-lg text-gray-200/90">
                  Conecta con artistas y recibe contenido exclusivo en cualquier momento.
                </p>
              </div>
            <div className="max-w-sm rounded-2xl border border-gray-800 bg-gray-900/70 px-4 py-3 text-sm text-gray-900 dark:text-gray-200">
              {heroNote}
            </div>
            </div>

          <div className="w-full max-w-md bg-gray-900/70 backdrop-blur-[4px] border-l border-gray-800 px-8 py-10 flex flex-col">
            <div className="mb-8 text-gray-100 text-sm uppercase tracking-widest flex items-center gap-2">
              <span className="text-2xl font-extrabold tracking-wide">Lustly</span>
              <span className="text-pink-500">♥</span>
            </div>
            <h1 className="text-3xl font-bold mb-6">
              {t('loginTitle') || 'Inicia sesión en tu cuenta'}
            </h1>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                  {t('email')}
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                  placeholder="tu@correo.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                  {t('password')}
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                  placeholder="********"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 rounded-md text-sm font-semibold text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (t('loggingIn') || 'Ingresando…') : (t('loginCta') || 'Iniciar Sesión')}
              </button>
            </form>

            {/* Mensajes */}
            {message && (
              <div
                className={`mt-4 text-center text-sm font-medium ${
                  isError ? 'text-red-400' : 'text-green-400'
                }`}
              >
                {message}
              </div>
            )}

            {/* Registro */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-300">
                {t('noAccountQuestion')}{' '}
                <Link
                  href={`/auth/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                  className="font-semibold text-pink-500 hover:text-pink-400"
                >
                  {t('signupHere')}
                </Link>
              </p>
            </div>

            <div className="mt-10 text-[11px] text-gray-500 text-center">
              © {new Date().getFullYear()} Lustly
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Bloque “Últimas publicaciones destacadas” (público) */}
      <PublicHighlights limit={18} />
    </>
  );
}
