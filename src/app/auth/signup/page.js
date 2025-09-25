'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { useLanguage } from '@/lib/i18n';
import PublicHighlights from '@/app/components/PublicHighlights';
import PublicTopbar from '@/app/components/PublicTopbar';

const BG = '/images/fondoinicio.jpg';

function FileInput({ id, label, accept, onChange }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-gray-300">
        {label}
      </label>
      <input
        id={id}
        type="file"
        accept={accept}
        onChange={(e) => onChange(e.target.files?.[0] || null)}
        className="block w-full text-sm text-gray-300 file:mr-3 file:rounded-full file:border-0 file:bg-pink-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-pink-700"
      />
    </div>
  );
}

function SignupInner() {
  const { data: session, status } = useSession();
  const { t } = useLanguage();
  const router = useRouter();
  const sp = useSearchParams();

  const [formData, setFormData] = useState({ username: '', email: '', password: '', role: 'consumer' });
  const [profileFile, setProfileFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  const callbackUrl = useMemo(() => sp?.get('callbackUrl') || '/', [sp]);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      router.replace(callbackUrl);
    }
  }, [status, session, callbackUrl, router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setMessage(t('registering') || 'Registrando…');
    setIsError(false);

    try {
      const payload = new FormData();
      payload.append('username', formData.username.trim());
      payload.append('email', formData.email.trim());
      payload.append('password', formData.password);
      payload.append('role', formData.role);
      if (profileFile) payload.append('profilePicture', profileFile);
      if (coverFile) payload.append('coverPhoto', coverFile);

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        body: payload,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || t('signupError') || 'Error en el registro');
      }

      // Autologin tras registro
      await signIn('credentials', {
        redirect: false,
        email: formData.email,
        password: formData.password,
      });

      setMessage(t('signupSuccess') || '¡Registro exitoso!');
      setIsError(false);
      router.replace(callbackUrl);
    } catch (err) {
      setMessage(err.message || (t('signupError') || 'Error en el registro.'));
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

  const heroTitle = t('signupTitle') || 'Crea tu cuenta gratis';
  const heroSubtitle = t('signupHeroBody') || 'Publica contenido exclusivo, gestiona suscripciones y conecta con tu comunidad.';

  return (
    <>
      <div className="relative min-h-[85vh]">
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          <img src={BG} alt="Fondo" className="w-full h-full object-cover scale-105 blur-sm" />
          <div className="absolute inset-0 bg-black/65" />
        </div>

        <div className="relative z-10 flex flex-col min-h-[85vh]">
          <PublicTopbar fullWidth />
          <div className="flex-1 flex flex-col md:flex-row">
            <div className="flex-1 flex flex-col justify-center px-8 md:px-12 lg:px-20 py-12 text-gray-100 space-y-6">
            <div className="max-w-2xl space-y-4">
              <h1 className="text-4xl lg:text-5xl font-bold leading-tight">{heroTitle}</h1>
              <p className="text-base lg:text-lg text-gray-200/90">{heroSubtitle}</p>
            </div>
            <div className="max-w-sm rounded-2xl border border-gray-800 bg-gray-900/70 px-4 py-3 text-sm text-gray-900 dark:text-gray-200">
              {t('homeHeroNote') || 'Explora avances de publicaciones públicas, descubre nuevos creadores y activa notificaciones personalizadas cuando te unas.'}
            </div>
          </div>

          <div className="w-full max-w-xl bg-gray-900/70 backdrop-blur-[4px] border-l border-gray-800 px-8 py-10 flex flex-col">
            <div className="mb-6 text-gray-100 text-sm uppercase tracking-widest flex items-center gap-2">
              <span className="text-2xl font-extrabold tracking-wide">Lustly</span>
              <span className="text-pink-500">♥</span>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label htmlFor="username" className="text-sm font-medium text-gray-300">
                    {t('username')}
                  </label>
                  <input
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                    placeholder="tu_usuario"
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="email" className="text-sm font-medium text-gray-300">{t('email')}</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                    placeholder="tu@correo.com"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="password" className="text-sm font-medium text-gray-300">{t('password')}</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                  placeholder="********"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FileInput
                  id="profilePicture"
                  label={t('profilePhoto') || 'Foto de perfil'}
                  accept="image/*"
                  onChange={setProfileFile}
                />
                <FileInput
                  id="coverPhoto"
                  label={t('coverPhoto') || 'Foto de portada'}
                  accept="image/*"
                  onChange={setCoverFile}
                />
              </div>

              <fieldset className="flex flex-col gap-2">
                <legend className="text-sm font-medium text-gray-300">{t('roleLabel') || 'Tipo de cuenta'}</legend>
                <div className="flex flex-col gap-2 bg-gray-800/60 border border-gray-700 rounded-lg p-3">
                  <label className="inline-flex items-start gap-3 text-sm text-gray-200">
                    <input
                      type="radio"
                      name="role"
                      value="consumer"
                      checked={formData.role === 'consumer'}
                      onChange={handleChange}
                      className="mt-0.5"
                    />
                    <span>{t('roleConsumer') || 'Soy fan (solo ver contenido)'}</span>
                  </label>
                  <label className="inline-flex items-start gap-3 text-sm text-gray-200">
                    <input
                      type="radio"
                      name="role"
                      value="creator"
                      checked={formData.role === 'creator'}
                      onChange={handleChange}
                      className="mt-0.5"
                    />
                    <span>{t('roleCreator') || 'Soy creador/a (publicar contenido)'}</span>
                  </label>
                </div>
              </fieldset>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 rounded-md text-sm font-semibold text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (t('registering') || 'Registrando…') : (t('signupCta') || 'Registrarse')}
              </button>
            </form>

            {message && (
              <div
                className={`mt-4 text-center text-sm font-medium ${
                  isError ? 'text-red-400' : 'text-green-400'
                }`}
              >
                {message}
              </div>
            )}

            <div className="mt-8 text-center text-sm text-gray-300">
              {t('haveAccountQuestion') || '¿Ya tienes una cuenta?'}{' '}
              <Link href={`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="font-semibold text-pink-500 hover:text-pink-400">
                {t('loginHere') || 'Inicia sesión aquí'}
              </Link>
            </div>

            <div className="mt-10 text-[11px] text-gray-500 text-center">
              © {new Date().getFullYear()} Lustly
            </div>
          </div>
          </div>
        </div>
      </div>

      <PublicHighlights limit={12} />
    </>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-gray-900 text-gray-200">Cargando…</div>}>
      <SignupInner />
    </Suspense>
  );
}
