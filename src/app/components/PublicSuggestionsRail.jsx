'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// Debug para verificar que este archivo se monta
console.log('PublicSuggestionsRail ACTIVO v2');

export default function PublicSuggestionsRail({ limit = 8 }) {
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
    Nuevos creadores
  </div>

      <div className="space-y-3">
        {users.map((u) => {
          const cover = u.coverPhoto || '/images/placeholder-cover.jpg';
          const avatar = u.profilePicture || '/images/placeholder-avatar.png';
          const handle = u.username ? `@${u.username}` : '@usuario';
          const display = u.displayName || u.username || 'Creador';

          return (
            <Link href={`/profile/${u._id}`} key={u._id} className="block group">
              <div className="relative rounded-2xl overflow-hidden border border-gray-800 bg-gray-900 shadow-sm hover:shadow-md transition-shadow">
                {/* Portada */}
                <div className="relative h-[120px] w-full">
                  <img src={cover} alt={`${handle} cover`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/70" />

                  {/* Avatar + textos */}
                  <div className="absolute left-3 right-3 bottom-3 flex items-center gap-3">
                    <div className="rounded-full p-1 bg-black/30 backdrop-blur-sm">
                      <img
                        src={avatar}
                        alt={`${handle} avatar`}
                        className="w-16 h-16 rounded-full object-cover ring-2 ring-white/70"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-white font-semibold text-[15px] leading-tight truncate group-hover:underline">
                        {display}
                      </div>
                      <div className="text-gray-200/90 text-[12px] truncate">
                        {handle}
                      </div>
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
