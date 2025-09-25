'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n';

export default function PublicHighlights({ limit = 20 }) {
  const { t, lang } = useLanguage();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const timeAgo = useCallback(
    (ts) => {
      try {
        const locale = lang || undefined;
        const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
        const diff = (Date.now() - new Date(ts).getTime()) / 1000;
        const units = [
          ['year', 60 * 60 * 24 * 365],
          ['month', 60 * 60 * 24 * 30],
          ['week', 60 * 60 * 24 * 7],
          ['day', 60 * 60 * 24],
          ['hour', 60 * 60],
          ['minute', 60],
          ['second', 1],
        ];
        for (const [unit, seconds] of units) {
          const delta = Math.floor(diff / seconds);
          if (Math.abs(delta) >= 1) return rtf.format(-delta, unit);
        }
        return rtf.format(0, 'second');
      } catch {
        try {
          return new Date(ts).toLocaleString(lang || undefined);
        } catch {
          return new Date(ts).toLocaleString();
        }
      }
    },
    [lang]
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`/api/posts/public?limit=${limit}`, { cache: 'no-store' });
        const j = await r.json();
        if (alive && r.ok) setPosts(j.posts || []);
      } catch {
        if (alive) setPosts([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [limit]);

  const title = t('publicHighlightsTitle') || 'Últimas publicaciones destacadas';
  const empty = t('publicHighlightsEmpty') || 'Aún no hay publicaciones.';
  const exclusiveLabel = t('exclusiveContentLabel') || 'Contenido exclusivo';
  const viewProfileLabel = t('viewProfile') || 'Ver perfil';
  const subscribeLabel = t('subscribe') || 'Suscribirse';

  return (
    <section className="bg-gray-900 text-gray-100 border-t border-gray-800">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h2 className="text-2xl sm:text-3xl font-bold mb-6">{title}</h2>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-lg bg-gray-800 h-64 animate-pulse" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-gray-400">{empty}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {posts.map((p) => {
              const mediaUrl = p.videoUrl || p.imageUrl || null;
              const isVideo = !!p.videoUrl || (p.imageUrl && !/\.(jpeg|jpg|gif|png|webp)$/i.test(p.imageUrl || ''));
              const fallbackHandle = t('creatorPlaceholder') || 'user';
              return (
                <article key={p._id} className="rounded-lg bg-gray-800 overflow-hidden shadow">
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-700">
                    <img
                      src={p.creator?.profilePicture || '/images/placeholder-avatar.png'}
                      alt={p.creator?.username || fallbackHandle}
                      className="w-9 h-9 rounded-full object-cover"
                    />
                    <div className="min-w-0">
                      <div className="font-semibold truncate">@{p.creator?.username || fallbackHandle}</div>
                      <div className="text-xs text-gray-400">{timeAgo(p.createdAt)}</div>
                    </div>
                  </div>

                  {mediaUrl && (
                    <div className="relative">
                      {isVideo ? (
                        <video
                          src={mediaUrl}
                          className={`w-full h-auto max-h-72 object-contain ${p.isExclusive ? 'blur-sm select-none pointer-events-none' : ''}`}
                          controls={!p.isExclusive}
                          playsInline
                        />
                      ) : (
                        <img
                          src={mediaUrl}
                          alt="media"
                          className={`w-full h-64 object-cover ${p.isExclusive ? 'blur-sm select-none pointer-events-none' : ''}`}
                        />
                      )}
                      {p.isExclusive && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="px-2 py-1 rounded bg-black/60 text-white text-xs">
                            {exclusiveLabel}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {p.text && !p.isExclusive && (
                    <p className="px-4 py-3 text-sm text-gray-200 whitespace-pre-wrap">
                      {p.text.length > 220 ? `${p.text.slice(0, 220)}…` : p.text}
                    </p>
                  )}

                  <div className="px-4 py-3 border-t border-gray-700 flex items-center gap-3">
                    <Link href={`/profile/${p.creatorId}`} className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-sm">
                      {viewProfileLabel}
                    </Link>
                    <Link
                      href={`/auth/login?callbackUrl=${encodeURIComponent(`/profile/${p.creatorId}`)}`}
                      className="px-3 py-1.5 rounded bg-pink-600 hover:bg-pink-700 text-sm"
                    >
                      {subscribeLabel}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
