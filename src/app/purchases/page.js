"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n';

export default function PurchasesPage() {
  const { t } = useLanguage();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/purchases');
        const j = await res.json();
        if (!res.ok) throw new Error(j.message || 'Error');
        setData(j.purchases || []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const format = (cents, cur='usd') => (cur||'').toLowerCase()==='clp' ? `${cents} CLP` : `$${(cents/100).toFixed(2)} USD`;

  if (loading) return <div className="p-6">{t('purchasesLoading')}</div>;
  if (error) return <div className="p-6 text-red-400">{error}</div>;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">{t('purchasesTitle')}</h1>
      {data.length === 0 ? (
        <div className="text-gray-400">{t('purchasesEmpty')}</div>
      ) : (
        <ul className="divide-y divide-gray-800 bg-gray-900 border border-gray-800 rounded">
          {data.map((p) => (
            <li key={p._id} className="px-4 py-3 flex items-center justify-between">
              <div className="text-sm text-gray-300">
                <Link href={`/posts/${p.postId}`} className="hover:underline">Post {String(p.postId).slice(-6)}</Link>
              </div>
              <div className="text-sm text-gray-400">{new Date(p.createdAt).toLocaleString()}</div>
              <div className="text-sm font-semibold">{format(p.amount||0, p.currency)}</div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 text-sm text-gray-400">{t('purchasesAccessNote')}</div>
    </div>
  );
}
