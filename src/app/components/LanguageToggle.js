"use client";

import { useLanguage } from '@/lib/i18n';

export default function LanguageToggle({ compact = false }) {
  const { lang, setLang } = useLanguage();

  const toggle = () => setLang(lang === 'es' ? 'en' : 'es');
  const targetLabel = lang === 'es' ? 'EN' : 'ES';

  return (
    <button
      onClick={toggle}
      title={lang === 'es' ? 'Switch to English' : 'Cambiar a Español'}
      aria-label={lang === 'es' ? 'Switch to English' : 'Cambiar a Español'}
      className={`px-3 py-1 rounded-full text-sm font-semibold cursor-pointer ${'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}
    >
      {targetLabel}
    </button>
  );
}
