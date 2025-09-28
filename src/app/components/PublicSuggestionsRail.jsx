
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n';

export default function PublicSuggestionsRail({ limit = 8 }) {
  const { t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`/api/suggestions/public?limit=${limit}`, { cache: 'no-store' });
        const j = await r.json();
        if (alive && r.ok) setUsers(j.users || []);
      } catch {
        if (alive) setUsers([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [limit]);

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
          <span className="text-sm font-semibold text-[var(--foreground)] dark:text-gray-200">{t('publicSuggestionsTitle') || 'Nuevos creadores'}</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {users.map((u) => {
            const avatar = u.profilePicture || '/images/placeholder-avatar.png';
            const username = u.username || 'user';
            const handle = `@${username}`;

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
                <div className="text-[11px] text-gray-400 truncate">{handle}</div>
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
        <aside className="hidden xl:block w-[540px] p-4 border-l border-gray-200 dark:border-gray-700">
          <div className="h-6 mb-3 bg-slate-200 dark:bg-gray-600/80 rounded w-40" />
          <div className="space-y-3">
            <div className="h-[120px] rounded-2xl bg-slate-200 dark:bg-gray-800/60" />
            <div className="h-[120px] rounded-2xl bg-slate-200 dark:bg-gray-800/60" />
          </div>
        </aside>
      );
    }

    if (!users.length) return null;

    return (
      <aside className="hidden xl:block w-[420px] p-4 border-l border-gray-200 dark:border-gray-800">
        <div className="text-xl font-bold text-[var(--foreground)] dark:text-gray-100 mb-3 leading-tight">
          {t('publicSuggestionsTitle') || 'Nuevos creadores'}
        </div>

        <div className="space-y-3">
          {users.map((u) => {
            const cover = u.coverPhoto || '/images/placeholder-cover.jpg';
            const avatar = u.profilePicture || '/images/placeholder-avatar.png';
            const fallbackHandle = t('userHandlePlaceholder') || '@usuario';
            const fallbackName = t('creatorPlaceholder') || 'Creador';
            const handle = u.username ? `@${u.username}` : fallbackHandle;
            const display = u.displayName || u.username || fallbackName;

            return (
              <Link href={`/profile/${u._id}`} key={u._id} className="block group">
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow">
                <div className="relative h-36 w-full">
                  <img src={cover} alt={`${handle} cover`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/55 to-black/90" />

                    <div className="absolute left-4 right-4 bottom-4 flex items-center gap-3">
                      <div className="rounded-full p-1 bg-black/30 backdrop-blur-sm">
                        <img
                          src={avatar}
                          alt={`${handle} avatar`}
                          className="w-16 h-16 rounded-full object-cover ring-2 ring-white/70"
                        />
                      </div>
                      <div className="min-w-0 text-slate-900 dark:text-gray-100">
                        <div className="text-[15px] font-semibold leading-tight truncate group-hover:underline">
                          {display}
                        </div>
                        <div className="text-slate-500 dark:text-gray-200/90 text-[12px] truncate">{handle}</div>
                      </div>
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


