// src/app/components/SuggestionsRail.js
'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

/**
 * Sidebar de sugerencias con fallback:
 * - Primero intenta /api/suggestions (requiere sesión)
 * - Si falla o viene vacío, cae a /api/suggestions/public
 * - Siempre renderiza el contenedor (aunque no haya datos) para que no "desaparezca"
 */
export default function SuggestionsRail({ limit = 6, title = 'Nuevos creadores' }) {
  const { data: session, status } = useSession();
  const [users, setUsers] = useState([]);
  const [usedFallback, setUsedFallback] = useState(false);
  const [loading, setLoading] = useState(true);

  const tryFetch = async () => {
    setLoading(true);
    setUsedFallback(false);
    try {
      // 1) Si hay sesión, intentar sugerencias autenticadas
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
      // 2) Fallback a públicas
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
    if (status === 'loading') return; // esperamos a saber si hay sesión
    tryFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session?.user?.id, limit]);

  const header = useMemo(() => {
    if (usedFallback) return title; // públicas
    return title; // puedes cambiarlo si quieres mostrar “Para ti”
  }, [title, usedFallback]);

  return (
    <aside className="hidden xl:block w-80 p-4 border-l border-gray-800">
      <div className="text-sm font-semibold text-gray-200 mb-3">{header}</div>

      {/* Loading skeleton simple */}
      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-2xl bg-gradient-to-b from-gray-800 to-gray-900/80 border border-gray-800 animate-pulse"
            />
          ))}
        </div>
      )}

      {!loading && users.length === 0 && (
        <div className="text-sm text-gray-500 bg-gray-900/60 border border-gray-800 rounded-xl p-4">
          Sin sugerencias por ahora.
        </div>
      )}

      {!loading && users.length > 0 && (
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
                className="block group rounded-3xl overflow-hidden border border-gray-800 bg-gray-900/80 shadow-sm hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="relative h-28 w-full bg-gray-800">
                  {cover ? (
                    <img src={cover} alt={`${username} cover`} className="w-full h-full object-cover" />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/35 to-black/75" />

                  <div className="absolute -bottom-10 left-4 flex items-center gap-3">
                    <div className="rounded-full p-1.5 bg-black/40 backdrop-blur">
                      <img
                        src={avatar}
                        alt={username}
                        className="w-20 h-20 rounded-full object-cover ring-2 ring-white/70"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-14 pb-5 px-5">
                  <div className="font-semibold text-base text-white leading-tight truncate group-hover:text-pink-300">
                    {username}
                  </div>
                  <div className="text-sm text-gray-400 truncate">{at}</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </aside>
  );
}
