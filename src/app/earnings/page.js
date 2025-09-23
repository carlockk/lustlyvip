"use client";

import { useEffect, useState } from 'react';
import DatePicker from '@/app/components/DatePicker';
import { useLanguage } from '@/lib/i18n';

export default function EarningsPage() {
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [showFrom, setShowFrom] = useState(false);
  const [showTo, setShowTo] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams();
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        const res = await fetch(`/api/earnings/ppv?${params.toString()}`);
        const j = await res.json();
        if (!res.ok) throw new Error(j.message || 'Error');
        setData(j);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [from, to]);

  const format = (cents, cur='usd') => {
    if ((cur||'').toLowerCase() === 'clp') return `${cents} CLP`;
    return `$${(cents/100).toFixed(2)} USD`;
  };

  if (loading) return <div className="p-6">{t('loadingGeneric')}</div>;
  if (error) return <div className="p-6 text-red-400">{error}</div>;

  const { aggregate, purchases } = data || {};

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">{t('earningsPpvTitle')}</h1>
      <div className="flex flex-wrap items-center gap-2 mb-4 relative">
        <span className="text-sm text-gray-400">{t('customDuration') || 'Duración personalizada'}:</span>
        <div className="relative">
          <button type="button" onClick={()=>setShowFrom(v=>!v)} className="px-2 py-1 rounded border border-gray-700 bg-gray-900 hover:bg-gray-700 text-sm">{from || (t('from') || 'Desde')}</button>
          {showFrom && (
            <div className="absolute z-20 mt-2">
              <DatePicker value={from} minDate={new Date(Date.now()-24*60*60*1000)} onChange={(iso)=>{ setFrom(iso); setShowFrom(false); }} onClose={()=>setShowFrom(false)} />
            </div>
          )}
        </div>
        <div className="relative">
          <button type="button" onClick={()=>setShowTo(v=>!v)} className="px-2 py-1 rounded border border-gray-700 bg-gray-900 hover:bg-gray-700 text-sm">{to || (t('to') || 'Hasta')}</button>
          {showTo && (
            <div className="absolute z-20 mt-2">
              <DatePicker value={to} minDate={from || new Date()} onChange={(iso)=>{ setTo(iso); setShowTo(false); }} onClose={()=>setShowTo(false)} />
            </div>
          )}
        </div>
        {(from || to) && (
          <button type="button" onClick={()=>{ setFrom(''); setTo(''); }} className="px-2 py-1 rounded border border-gray-700 bg-gray-800 hover:bg-gray-700 text-sm">{t('cancel') || 'Cancelar'}</button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 border border-gray-700 rounded p-4">
          <div className="text-sm text-gray-400">{t('gross')}</div>
          <div className="text-xl">{format(aggregate?.gross||0, aggregate?.currency)}</div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded p-4">
          <div className="text-sm text-gray-400">{t('platformFee')}</div>
          <div className="text-xl">{format(aggregate?.fee||0, aggregate?.currency)}</div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded p-4">
          <div className="text-sm text-gray-400">{t('creatorNet')}</div>
          <div className="text-xl">{format(aggregate?.net||0, aggregate?.currency)}</div>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded">
        <div className="px-4 py-2 border-b border-gray-800 text-gray-400 text-sm">{t('transactions')}</div>
        <ul className="divide-y divide-gray-800">
          {(purchases||[]).map(p => (
            <li key={p._id} className="px-4 py-3 flex items-center justify-between">
              <div className="text-sm text-gray-300">Post {String(p.postId).slice(-6)}</div>
              <div className="text-sm text-gray-400">{new Date(p.createdAt).toLocaleString()}</div>
              <div className="text-sm font-semibold">{format(p.creatorNetCents||0, p.currency)}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
