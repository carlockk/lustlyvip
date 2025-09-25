
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

  if (loading) {
    return (
      <aside className="hidden xl:block w-[500px] p-4 border-l border-gray-600">
        <div className="h-6 mb-3 bg-gray-600/80 rounded w-40" />
        <div className="space-y-3">
          <div className="h-[120px] rounded-2xl bg-gray-800/60" />
          <div className="h-[120px] rounded-2xl bg-gray-800/60" />
        </div>
      </aside>
    );
  }

  if (!users.length) return null;

  return (
    <aside className="hidden xl:block w-[360px] p-4 border-l border-gray-800">
      <div className="text-xl font-bold text-gray-100 mb-3 leading-tight">
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
              <div className="relative rounded-2xl overflow-hidden border border-gray-800 bg-black/70 dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow">
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
                    <div className="min-w-0 text-white">
                      <div className="text-[15px] font-semibold leading-tight truncate group-hover:underline">
                        {display}
                      </div>
                      <div className="text-gray-200/90 text-[12px] truncate">{handle}</div>
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
}
