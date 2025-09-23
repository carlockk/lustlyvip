"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n';

export default function FavoritesPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/favorites');
        const j = await res.json();
        if (!res.ok) throw new Error(j.message || 'No se pudieron cargar favoritos');
        setItems(j.favorites || []);
      } catch (e) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, []);

  const removeFav = async (id) => {
    try {
      const res = await fetch(`/api/favorites/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('No se pudo quitar de favoritos');
      setItems(items.filter(x => x._id !== id));
    } catch (e) { alert(e.message); }
  };

  if (loading) return <div className="p-6 text-gray-200">{t('favoritesLoading')}</div>;
  if (error) return <div className="p-6 text-red-400">{error}</div>;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">{t('favoritesTitle')}</h1>
      {items.length === 0 ? (
        <div className="text-gray-400">{t('favoritesEmpty')}</div>
      ) : (
        <ul className="space-y-3">
          {items.map(it => (
            <li key={it._id} className="flex items-center justify-between p-3 border border-gray-700 rounded bg-gray-800">
              <div className="flex items-center gap-3">
                <img src={it.profilePicture || '/images/placeholder-avatar.png'} alt={it.username} className="w-10 h-10 rounded-full object-cover" />
                <div className="flex flex-col">
                  <Link href={`/profile/${it._id}`} className="text-gray-100 hover:underline">@{it.username}</Link>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/profile/${it._id}`} className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-sm">{t('viewProfile')}</Link>
                <button onClick={() => removeFav(it._id)} className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-sm">{t('remove')}</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
