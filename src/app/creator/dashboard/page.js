"use client";

import { useEffect, useState } from 'react';
import DatePicker from '@/app/components/DatePicker';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n';

const fmt = (cents, cur) => (cur||'').toLowerCase()==='clp' ? `${cents} CLP` : `$${(cents/100).toFixed(2)} USD`;

export default function CreatorDashboardPage() {
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [range, setRange] = useState('30d');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [showFrom, setShowFrom] = useState(false);
  const [showTo, setShowTo] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams();
        params.set('range', range);
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        const res = await fetch(`/api/analytics/creator/summary?${params.toString()}`);
        const j = await res.json();
        if (!res.ok) throw new Error(j.message || 'Error');
        setData(j);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [range, from, to]);

  if (loading) return <div className="p-6">{t('loadingDashboard')}</div>;
  if (error) return <div className="p-6 text-red-400">{error}</div>;

  const { totals, subsActive, topPosts } = data || {};
  const currencies = Object.keys(totals||{});

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('creatorDashboardTitle')}</h1>
        <div className="flex gap-2 items-center relative flex-wrap">
          <label className="text-sm text-gray-400">{t('range')}</label>
          <select value={range} onChange={e=>setRange(e.target.value)} className="p-2 bg-gray-800 border border-gray-700 rounded text-sm">
            <option value="7d">{t('days7')}</option>
            <option value="30d">{t('days30')}</option>
            <option value="90d">{t('days90')}</option>
          </select>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">{t('customDuration') || 'Duración personalizada'}:</span>
            <div className="relative">
              <button type="button" onClick={()=>setShowFrom(v=>!v)} className="px-2 py-1 rounded border border-gray-700 bg-gray-900 hover:bg-gray-700">{from || (t('from') || 'Desde')}</button>
              {showFrom && (
                <div className="absolute z-20 mt-2">
                  <DatePicker value={from} minDate={new Date(Date.now()-24*60*60*1000)} onChange={(iso)=>{ setFrom(iso); setShowFrom(false); }} onClose={()=>setShowFrom(false)} />
                </div>
              )}
            </div>
            <div className="relative">
              <button type="button" onClick={()=>setShowTo(v=>!v)} className="px-2 py-1 rounded border border-gray-700 bg-gray-900 hover:bg-gray-700">{to || (t('to') || 'Hasta')}</button>
              {showTo && (
                <div className="absolute z-20 mt-2">
                  <DatePicker value={to} minDate={from || new Date()} onChange={(iso)=>{ setTo(iso); setShowTo(false); }} onClose={()=>setShowTo(false)} />
                </div>
              )}
            </div>
            {(from || to) && (
              <button type="button" onClick={()=>{ setFrom(''); setTo(''); }} className="px-2 py-1 rounded border border-gray-700 bg-gray-800 hover:bg-gray-700">{t('cancel') || 'Cancelar'}</button>
            )}
          </div>
          <Link href="/earnings" className="px-3 py-2 rounded bg-gray-800 border border-gray-700">{t('viewEarnings')}</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded p-4">
          <div className="text-sm text-gray-400">{t('activeSubscribers')}</div>
          <div className="text-2xl">{subsActive || 0}</div>
        </div>
        {currencies.map(cur => (
          <div key={cur} className="bg-gray-800 border border-gray-700 rounded p-4">
            <div className="text-sm text-gray-400">{t('netIncome')} ({cur.toUpperCase()})</div>
            <div className="text-2xl">{fmt(totals[cur]?.net||0, cur)}</div>
          </div>
        ))}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded">
        <div className="px-4 py-2 border-b border-gray-800 text-gray-400 text-sm">{t('topPpvPosts')}</div>
        <ul className="divide-y divide-gray-800">
          {(topPosts||[]).map(p => (
            <li key={p.postId} className="px-4 py-3 flex items-center justify-between">
              <div className="text-sm text-gray-300"><Link href={`/posts/${p.postId}`} className="hover:underline">Post {String(p.postId).slice(-6)}</Link></div>
              <div className="text-sm text-gray-400">{p.count} {t('purchasesLabel')}</div>
              <div className="text-sm font-semibold">{fmt(p.net||0, p.currency)}</div>
            </li>
          ))}
          {(topPosts||[]).length === 0 && (
            <li className="px-4 py-3 text-gray-400">{t('noPpvPurchasesYet')}</li>
          )}
        </ul>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded">
        <div className="px-4 py-2 border-b border-gray-800 text-gray-400 text-sm">{t('topViewedPosts')}</div>
        <ul className="divide-y divide-gray-800">
          {(data?.topViewedPosts||[]).map(p => (
            <li key={p.postId} className="px-4 py-3 flex items-center justify-between">
              <div className="text-sm text-gray-300"><Link href={`/posts/${p.postId}`} className="hover:underline">Post {String(p.postId).slice(-6)}</Link></div>
              <div className="text-sm text-gray-400">{p.count} {t('viewsLabel')}</div>
            </li>
          ))}
          {(data?.topViewedPosts||[]).length === 0 && (
            <li className="px-4 py-3 text-gray-400">{t('noViewsYet')}</li>
          )}
        </ul>
      </div>
    </div>
  );
}
