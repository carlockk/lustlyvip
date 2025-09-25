'use client';

import { useLanguage } from '@/lib/i18n';
import PostList from '@/app/components/PostList';
import SuggestionsRail from '@/app/components/SuggestionsRail';

export default function HomeAuthenticated() {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col xl:flex-row min-h-[calc(100vh-4rem)] bg-gray-900 text-gray-100">
      <main className="flex-1 px-4 sm:px-6 lg:px-10 py-6">
        <div className="max-w-3xl mx-auto w-full space-y-6">
          <header className="flex flex-col gap-1">
            <h1 className="text-3xl font-semibold tracking-tight">
              {t('homeFeedTitle') || 'Inicio'}
            </h1>
            <p className="text-sm text-gray-400">
              {t('homeFeedSubtitle') || 'Descubre contenido de tus creadores favoritos y encuentra nuevas recomendaciones.'}
            </p>
          </header>
          <PostList endpoint="/api/posts" />
        </div>
      </main>

      <SuggestionsRail limit={6} title={t('suggestedCreators') || 'Creadores sugeridos'} />
    </div>
  );
}

