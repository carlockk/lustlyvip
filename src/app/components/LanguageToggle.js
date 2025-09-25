"use client";

import { useLanguage } from '@/lib/i18n';

export default function LanguageToggle({ compact = false }) {
  const { lang, setLang, t } = useLanguage();

  const toggle = () => setLang(lang === 'es' ? 'en' : 'es');
  const targetLabel = lang === 'es' ? 'EN' : 'ES';

  const title =
    lang === 'es'
      ? t('switchToEnglish') || 'Switch to English'
      : t('switchToSpanish') || 'Cambiar a Español';

  return (
    <button
      onClick={toggle}
      title={title}
      aria-label={title}
      className="px-3 py-1 rounded-full text-sm font-semibold cursor-pointer bg-gray-700 text-gray-200 hover:bg-gray-600"
    >
      {targetLabel}
    </button>
  );
}
