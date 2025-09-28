// src/app/components/SuggestionsRail.js
'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/lib/i18n';

/**
 * Sidebar de sugerencias con fallback:
 * - Primero intenta /api/suggestions (requiere sesión)
 * - Si falla o viene vacío, cae a /api/suggestions/public
 * - Siempre renderiza el contenedor (aunque no haya datos) para que no "desaparezca"
 */
export default function SuggestionsRail({ limit = 6, title = 'Nuevos creadores' }) {
  const { data: session, status } = useSession();
  const { t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [usedFallback, setUsedFallback] = useState(false);
  const [loading, setLoading] = useState(true);

  const tryFetch = async () => {
    setLoading(true);
    setUsedFallback(false);
    try {
      if (session?.user?.id) {
        const r = await fetch(`/api/suggestions`, { cache: 'no-store' });
        if (r.ok) {
          const j = await r.json();
          if (Array.isArray(j?.users) && j.users.length) {
            setUsers(j.users.slice(0, limit));
            setUsedFallback(false);
            return;
          }
        }
      }
      const r2 = await fetch(`/api/suggestions/public?limit=${limit}`, { cache: 'no-store' });
      const j2 = await r2.json();
      setUsers(Array.isArray(j2?.users) ? j2.users : []);
      setUsedFallback(true);
    } catch {
      setUsers([]);
      setUsedFallback(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'loading') return;
    tryFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session?.user?.id, limit]);

  const header = useMemo(() => {
    if (usedFallback) return title;
    return title;
  }, [title, usedFallback]);

  const renderMobile = () => {
    if (loading) {
      return (
        <div className="xl:hidden mb-6 px-4">
          <div className="h-4 w-32 bg-slate-200 dark:bg-gray-700/70 rounded mb-3" />
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="w-[170px] h-[120px] rounded-xl bg-slate-200 dark:bg-gray-800/60 animate-pulse" />
            ))}
          </div>
        </div>
      );
    }
    if (!users.length) return null;

    return (
      <div className="xl:hidden mb-6 px-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-[var(--foreground)] dark:text-gray-200">{header}</span>
        </div>
        <div
          className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {users.map((u) => {
            const avatar = u.profilePicture || '/images/placeholder-avatar.png';
            const username = u.username || 'user';
            const at = `@${username}`;

            return (
              <Link
                key={u._id}
                href={`/profile/${u._id}`}
                className="flex-shrink-0 w-[180px] snap-start rounded-xl border border-gray-700/60 bg-gray-800/70 p-3 text-center hover:border-pink-500/60 transition-colors"
              >
                <div className="w-14 h-14 mx-auto rounded-full overflow-hidden mb-2">
                  <img src={avatar} alt={username} className="w-full h-full object-cover" />
                </div>
                <div className="text-sm font-semibold text-gray-100 truncate">{username}</div>
                <div className="text-[11px] text-gray-400 truncate">{at}</div>
              </Link>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDesktop = () => {
    if (loading) {
      return (
        <aside className="hidden xl:block w-96 p-4 border-l border-gray-200 dark:border-gray-800">
          <div className="text-base font-semibold text-[var(--foreground)] dark:text-gray-200 mb-3">{header}</div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-32 rounded-2xl bg-gradient-to-b from-slate-200 to-slate-300 dark:from-gray-800 dark:to-gray-900/80 border border-slate-200 dark:border-gray-800 animate-pulse"
              />
            ))}
          </div>
        </aside>
      );
    }

    if (!users.length) {
      return (
        <aside className="hidden xl:block w-96 p-4 border-l border-gray-200 dark:border-gray-800">
          <div className="text-base font-semibold text-[var(--foreground)] dark:text-gray-200 mb-3">{header}</div>
          <div className="text-sm text-slate-500 dark:text-gray-400 bg-white dark:bg-gray-900/60 border border-slate-200 dark:border-gray-800 rounded-xl p-4">
            {t('noSuggestionsYet') || 'Sin sugerencias por ahora.'}
          </div>
        </aside>
      );
    }

    return (
      <aside className="hidden xl:block w-96 p-4 border-l border-gray-200 dark:border-gray-800">
        <div className="text-base font-semibold text-[var(--foreground)] dark:text-gray-200 mb-3">{header}</div>
        <div className="space-y-4">
          {users.map((u) => {
            const cover = u.coverPhoto || u.cover || '';
            const avatar = u.profilePicture || '/images/placeholder-avatar.png';
            const username = u.username || 'user';
            const at = `@${username}`;

            return (
              <Link
                key={u._id}
                href={`/profile/${u._id}`}
                className="block group rounded-2xl overflow-hidden border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900/80 shadow-sm hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="relative h-36 w-full bg-slate-200 dark:bg-gray-800">
                  {cover ? (
                    <img src={cover} alt={`${username} cover`} className="w-full h-full object-cover" />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/55 to-black/90" />

                  <div className="absolute left-4 right-4 bottom-4 flex items-center gap-3">
                    <div className="rounded-full p-1.5 bg-black/40 backdrop-blur">
                      <img
                        src={avatar}
                        alt={username}
                        className="w-16 h-16 rounded-full object-cover ring-2 ring-white/80"
                      />
                    </div>
                    <div className="min-w-0 text-slate-900 dark:text-gray-100">
                      <div className="font-semibold text-base leading-tight truncate group-hover:text-pink-300">
                        {username}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-gray-300 truncate">{at}</div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </aside>
    );
  };

  return (
    <>
      {renderMobile()}
      {renderDesktop()}
    </>
  );
}
