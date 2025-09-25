'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FaHeart, FaImage, FaVideo } from 'react-icons/fa';
import { useLanguage } from '@/lib/i18n';

export default function ExplorePage() {
  const { t } = useLanguage();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const rtf = useMemo(() => {
    try {
      return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
    } catch {
      return null;
    }
  }, []);

  const lastPostLabel = t('lastPostAgo') || 'Última publicación';

  const formatRelative = (value) => {
    try {
      const date = new Date(value);
      if (!rtf || Number.isNaN(date.getTime())) return date.toLocaleString();
      const diffSeconds = Math.round((Date.now() - date.getTime()) / 1000);
      const units = [
        ['year', 60 * 60 * 24 * 365],
        ['month', 60 * 60 * 24 * 30],
        ['week', 60 * 60 * 24 * 7],
        ['day', 60 * 60 * 24],
        ['hour', 60 * 60],
        ['minute', 60],
      ];
      for (const [unit, seconds] of units) {
        const delta = Math.floor(diffSeconds / seconds);
        if (Math.abs(delta) >= 1) return rtf.format(-delta, unit);
      }
      return rtf.format(0, 'second');
    } catch (e) {
      return new Date(value).toLocaleString();
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/creators/explore?limit=40', { cache: 'no-store' });
        if (res.ok) {
          const j = await res.json();
          setItems(j.creators || []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="flex-1 p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">{t('exploreCreatorsTitle')}</h1>
        {loading && items.length === 0 && <div className="text-gray-400">{t('loadingGeneric')}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((it) => {
            const username = it.creator.username;
            const handle = `@${username}`;
            const cover = it.creator.coverPhoto || it.latestPost?.imageUrl || '/images/placeholder-cover.jpg';
            const avatar = it.creator.profilePicture || '/images/placeholder-avatar.png';

            return (
              <Link
                key={it.creator._id}
                href={`/profile/${it.creator._id}`}
                className="group relative block overflow-hidden rounded-3xl border border-gray-800 bg-gray-900/80 shadow-sm hover:shadow-xl transition-shadow"
              >
                <div className="relative h-36 w-full bg-gray-800">
                  {cover ? (
                    <img src={cover} alt={`${username} cover`} className="w-full h-full object-cover" />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/40 to-black/75" />

                  <div className="absolute left-5 -bottom-12 flex items-end gap-3">
                    <div className="rounded-full p-1.5 bg-black/40 backdrop-blur">
                      <img
                        src={avatar}
                        alt={`${username} avatar`}
                        className="w-20 h-20 rounded-full object-cover ring-2 ring-white/70"
                      />
                    </div>
                    <div className="hidden sm:flex flex-col pb-3">
                      <span className="text-white font-semibold text-lg leading-tight group-hover:text-pink-300 transition-colors">
                        {username}
                      </span>
                      <span className="text-sm text-gray-300">{handle}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-16 pb-6 px-5 space-y-3">
                  <div className="sm:hidden">
                    <div className="text-white font-semibold text-base leading-tight">
                      {username}
                    </div>
                    <div className="text-sm text-gray-400">{handle}</div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-300">
                    <span className="flex items-center gap-1">
                      <FaHeart className="text-pink-500" />
                      {it.likes}
                    </span>
                    <span className="flex items-center gap-1">
                      <FaImage />
                      {it.images}
                    </span>
                    <span className="flex items-center gap-1">
                      <FaVideo />
                      {it.videos}
                    </span>
                  </div>

                  {it.latestPost?.createdAt && (
                    <div className="text-xs text-gray-500">
                      {`${lastPostLabel}: ${formatRelative(it.latestPost.createdAt)}`}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
