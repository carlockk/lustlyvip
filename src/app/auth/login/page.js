// src/app/auth/login/page.js
'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';
import PublicHighlights from '@/app/components/PublicHighlights';

// evita prerender estático (corrige el error en Vercel)
export const dynamic = 'force-dynamic';

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

  return (
    <>
      {/* Hero de login */}
      <div className="relative min-h-screen">
        {/* Fondo */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${BG})` }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-black/45" aria-hidden="true" />

        {/* Panel derecho */}
        <div className="relative min-h-screen flex justify-end">
          <div className="w-full max-w-md bg-gray-900/85 backdrop-blur-sm border-l border-gray-800 px-8 py-10 flex flex-col">
            {/* Marca */}
            <div className="mb-8">
              <Link href="/" className="inline-flex items-center gap-2">
                <span className="text-2xl font-extrabold tracking-wide">Lustly</span>
                <span className="text-pink-500">♥</span>
              </Link>
              <h1 className="mt-4 text-3xl font-bold">
                {t('loginTitle') || 'Inicia sesión en tu cuenta'}
              </h1>
              <p className="mt-1 text-gray-400">
                {t('loginSubtitle') || 'Accede para descubrir contenido exclusivo.'}
              </p>
            </div>

            {/* Form */}
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

      {/* Bloque “Últimas publicaciones destacadas” (público) */}
      <PublicHighlights limit={18} />
    </>
  );
}
