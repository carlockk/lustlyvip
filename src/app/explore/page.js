'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FaHeart, FaImage, FaVideo } from 'react-icons/fa';
import { useLanguage } from '@/lib/i18n';

export default function ExplorePage() {
  const { t } = useLanguage();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((it) => (
            <Link key={it.creator._id} href={`/profile/${it.creator._id}`} className="rounded-lg overflow-hidden bg-gray-800 border border-gray-700 hover:border-pink-600 transition-colors cursor-pointer">
              <div className="h-28 bg-gray-700">
                {it.creator.coverPhoto || it.latestPost?.imageUrl ? (
                  <img src={(it.creator.coverPhoto || it.latestPost?.imageUrl)} alt="cover" className="w-full h-28 object-cover" />
                ) : null}
              </div>
              <div className="p-3 flex items-center gap-3">
                <img src={it.creator.profilePicture || '/images/placeholder-avatar.png'} alt={it.creator.username} className="w-12 h-12 rounded-full object-cover" />
                <div className="flex-1">
                  <div className="text-gray-100 font-semibold">@{it.creator.username}</div>
                  <div className="flex items-center gap-4 text-xs text-gray-300 mt-1">
                    <span className="flex items-center gap-1"><FaHeart className="text-pink-500" />{it.likes}</span>
                    <span className="flex items-center gap-1"><FaImage />{it.images}</span>
                    <span className="flex items-center gap-1"><FaVideo />{it.videos}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

