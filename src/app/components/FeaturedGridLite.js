'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function FeaturedGridLite() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/creators/explore');
        const j = await r.json();
        if (r.ok && Array.isArray(j.creators)) {
          // Use top 6
          const flat = j.creators.map(c => ({
            id: c._id || c.id,
            name: c.displayName || c.name || c.username,
            handle: c.username || c.handle || (c._id || '').slice(-6),
            coverUrl: c.coverUrl || c.bannerUrl || c.avatar || '/images/fondoinicio.jpg',
          })).slice(0,6);
          setItems(flat);
        } else {
          setItems([]);
        }
      } catch { setItems([]); }
    })();
  }, []);

  if (!items.length) {
    return <div className="text-slate-500 dark:text-white/70">No hay publicaciones destacadas todavía.</div>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((p) => (
        <Link key={p.id} href={`/profile/${p.id}`} className="group rounded-2xl overflow-hidden border border-white/10 hover:shadow-xl">
          <div className="aspect-[4/3] bg-black/30 relative">
            <img src={p.coverUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-2 left-3 right-3">
              <div className="text-sm text-slate-500 dark:text-white/80">@{p.handle}</div>
              <div className="text-base font-semibold">{p.name}</div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

