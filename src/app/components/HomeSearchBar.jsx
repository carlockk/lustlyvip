'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n';

const truncate = (value, max = 120) => {
  if (!value) return '';
  if (value.length <= max) return value;
  return value.slice(0, max - 1) + '...';
};

export default function HomeSearchBar() {
  const { t, lang } = useLanguage();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState({ creators: [], posts: [] });

  const dtf = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(lang || 'es', {
        dateStyle: 'medium',
      });
    } catch {
      return null;
    }
  }, [lang]);

  useEffect(() => {
    const value = query.trim();
    if (!value) {
      setResults({ creators: [], posts: [] });
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(value)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('search-error');
        const data = await res.json();
        setResults({
          creators: data?.creators || [],
          posts: data?.posts || [],
        });
      } catch (err) {
        if (err.name === 'AbortError') return;
        setError(t('searchError') || 'No se pudo completar la búsqueda.');
        setResults({ creators: [], posts: [] });
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, t]);

  const showResults = Boolean(query.trim());
  const hasResults = (results.creators?.length || 0) > 0 || (results.posts?.length || 0) > 0;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm text-gray-900 dark:bg-gray-900/60 dark:border-gray-800 dark:text-gray-100">
      <label
        htmlFor="home-search"
        className="block text-sm font-medium text-gray-900 mb-2 dark:text-gray-300"
      >
        {t('searchPostsOrCreatorsLabel') || 'Buscar publicaciones o creadores'}
      </label>
      <input
        id="home-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('searchPostsOrCreatorsPlaceholder') || 'Escribe para buscar'}
        className="w-full rounded-xl bg-gray-800 border border-gray-700 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500/70 focus:border-transparent"
        autoComplete="off"
      />

      {showResults && (
        <div className="mt-4 space-y-4">
          {loading && <div className="text-xs text-gray-400">{t('searching') || 'Buscando...'}</div>}
          {error && <div className="text-xs text-red-400">{error}</div>}

          {!loading && !error && !hasResults && (
            <div className="text-xs text-gray-500">
              {t('noSearchResults') || 'Sin coincidencias por ahora.'}
            </div>
          )}

          {!loading && !error && results.creators?.length > 0 && (
            <div>
              <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-2">
                {t('searchCreatorsHeading') || 'Creadores'}
              </div>
              <div className="divide-y divide-gray-800 rounded-xl border border-gray-800 overflow-hidden">
                {results.creators.map((creator) => (
                  <Link
                    key={creator._id}
                    href={`/profile/${creator._id}`}
                    className="flex items-center gap-3 bg-gray-900/60 hover:bg-gray-800/80 px-4 py-3 transition-colors"
                  >
                    <img
                      src={creator.profilePicture || '/images/placeholder-avatar.png'}
                      alt={creator.username}
                      className="w-10 h-10 rounded-full object-cover"
                      loading="lazy"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-100 truncate">@{creator.username}</p>
                      {creator.bio && (
                        <p className="text-xs text-gray-400 truncate">{truncate(creator.bio, 80)}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {!loading && !error && results.posts?.length > 0 && (
            <div>
              <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-2">
                {t('searchPostsHeading') || 'Publicaciones'}
              </div>
              <div className="space-y-3">
                {results.posts.map((post) => (
                  <Link
                    key={post._id}
                    href={`/posts/${post._id}`}
                    className="block bg-gray-900/60 hover:bg-gray-800/80 border border-gray-800 rounded-xl px-4 py-3 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-100 truncate">@{post.creator?.username}</p>
                        <p className="text-xs text-gray-500">
                          {dtf && post.createdAt ? dtf.format(new Date(post.createdAt)) : ''}
                        </p>
                      </div>
                      {post.thumbnail && (
                        <img
                          src={post.thumbnail}
                          alt={post.creator?.username || 'post'}
                          className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                          loading="lazy"
                        />
                      )}
                    </div>
                    {post.text && (
                      <p className="mt-2 text-sm text-gray-300 line-clamp-2">
                        {truncate(post.text, 160)}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
