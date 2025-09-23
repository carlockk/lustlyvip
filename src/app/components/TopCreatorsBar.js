'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { cloudinaryLoader } from '@/lib/cloudinaryLoader';
import { FaHeart, FaImage, FaVideo } from 'react-icons/fa';

export default function TopCreatorsBar() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await fetch('/api/creators/explore?limit=20', { cache: 'no-store' });
      if (res.ok) {
        const j = await res.json();
        setItems(j.creators || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const safeLoad = () => { if (typeof document === 'undefined' || document.visibilityState === 'visible') load(); };
    safeLoad();
    const onVisibility = () => { if (document.visibilityState === 'visible') safeLoad(); };
    document.addEventListener('visibilitychange', onVisibility);
    const t = setInterval(safeLoad, 30000);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVisibility); };
  }, []);

  if (loading && items.length === 0) return null;

  return (
    <div className="w-full border-b border-gray-800 bg-gray-900/70 backdrop-blur sticky top-0 z-20">
      <div className="max-w-5xl mx-auto px-4 py-2 overflow-x-auto no-scrollbar">
        <div className="flex gap-4 min-w-max">
          {items.map((it) => (
            <Link key={it.creator._id} href={`/profile/${it.creator._id}`} className="flex items-center gap-3 bg-gray-800 hover:bg-gray-700 rounded-lg p-2 cursor-pointer">
              <Image loader={cloudinaryLoader} src={it.creator.profilePicture || '/images/placeholder-avatar.png'} alt={it.creator.username} width={32} height={32} sizes="32px" className="w-8 h-8 rounded-full object-cover" />
              <div className="flex items-center gap-2">
                {it.creator.coverPhoto || it.latestPost?.imageUrl ? (
                  <Image loader={cloudinaryLoader} src={(it.creator.coverPhoto || it.latestPost?.imageUrl)} alt="cover" width={64} height={32} sizes="64px" className="w-16 h-8 object-cover rounded" />
                ) : (
                  <div className="w-16 h-8 bg-gray-700 rounded" />
                )}
                <div className="flex flex-col">
                  <span className="text-xs text-gray-100 font-semibold">@{it.creator.username}</span>
                  <div className="flex items-center gap-3 text-[10px] text-gray-300">
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
