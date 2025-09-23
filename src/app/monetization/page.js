// src/app/monetization/page.js

'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n';

export default function MonetizationPage() {
  const { t } = useLanguage();
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('usd');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [current, setCurrent] = useState(null);
  const [plans, setPlans] = useState({
    day_1: { amount: '', introPercent: '' },
    week_1: { amount: '', introPercent: '' },
    month_1: { amount: '', introPercent: '' },
    month_3: { amount: '', introPercent: '' },
    month_6: { amount: '', introPercent: '' },
    year_1: { amount: '', introPercent: '' },
  });
  const [savingPlans, setSavingPlans] = useState(false);
  const [connect, setConnect] = useState({ connected: false, chargesEnabled: false, accountId: null, loading: false, error: null });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/creators/monetization');
        const data = await res.json();
        if (res.ok) setCurrent(data);
      } catch {}
      try {
        const r2 = await fetch('/api/creators/monetization/plans');
        const d2 = await r2.json();
        if (r2.ok) {
          const intro = d2.introPercents || {};
          setPlans((prev) => ({
            ...prev,
            day_1: { amount: '', introPercent: intro.day_1 || '' },
            week_1: { amount: '', introPercent: intro.week_1 || '' },
            month_1: { amount: '', introPercent: intro.month_1 || '' },
            month_3: { amount: '', introPercent: intro.month_3 || '' },
            month_6: { amount: '', introPercent: intro.month_6 || '' },
            year_1: { amount: '', introPercent: intro.year_1 || '' },
          }));
        }
      } catch {}
      try {
        const cs = await fetch('/api/stripe/connect/status');
        const j = await cs.json();
        if (cs.ok) setConnect((c)=>({ ...c, ...j }));
      } catch {}
    })();
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const cents = (currency.toLowerCase() === 'clp')
        ? parseInt(amount, 10)
        : Math.round(parseFloat(amount) * 100);
      const res = await fetch('/api/creators/monetization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: cents, currency })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error');
      setMessage(t('saved'));
      setCurrent(data);
    } catch (e) {
      setMessage(e.message);
    } finally {
      setLoading(false);
    }
  };

  const savePlans = async (e) => {
    e.preventDefault();
    setSavingPlans(true);
    setMessage(null);
    try {
      const bodyPlans = {};
      for (const [k, v] of Object.entries(plans)) {
        const amt = (v.amount || '').trim();
        const pct = (v.introPercent || '').trim();
        if (amt) {
          const cents = (currency.toLowerCase() === 'clp') ? parseInt(amt, 10) : Math.round(parseFloat(amt) * 100);
          if (!Number.isFinite(cents) || cents <= 0) throw new Error(`Monto inválido para ${k}`);
          const introPercent = pct ? parseInt(pct, 10) : 0;
          bodyPlans[k] = { amount: cents, introPercent };
        }
      }
      if (Object.keys(bodyPlans).length === 0) throw new Error('Define al menos un plan con monto.');
      const res = await fetch('/api/creators/monetization/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency, plans: bodyPlans })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error');
      setMessage(t('saved'));
    } catch (e) {
      setMessage(e.message);
    } finally {
      setSavingPlans(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">{t('monetizationTitle')}</h1>
      <p className="text-gray-400 mb-4">{t('monetizationDesc')}</p>
      <div className="mb-6 p-4 border border-gray-700 rounded bg-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Pagos a tu cuenta (Stripe)</div>
            <div className="text-xs text-gray-400">Estado: {connect.connected ? (connect.chargesEnabled ? 'Conectado y listo para cobrar' : 'Conectado, pendiente de verificación') : 'No conectado'}</div>
            {connect.accountId && <div className="text-xs text-gray-500">Cuenta: {connect.accountId}</div>}
          </div>
          {!connect.connected ? (
            <button
              onClick={async()=>{ try{ setConnect(c=>({ ...c, loading:true, error:null })); const r = await fetch('/api/stripe/connect/onboard', { method:'POST' }); const j = await r.json(); if(!r.ok) throw new Error(j.message||'Error'); window.location.href = j.url; } catch(e){ setConnect(c=>({ ...c, loading:false, error: e.message })); } }}
              className={`px-3 py-2 rounded ${connect.loading ? 'bg-gray-600' : 'bg-pink-600 hover:bg-pink-700'}`}
            >{connect.loading ? 'Abriendo…' : 'Conectar pagos (Stripe)'}</button>
          ) : (
            <button onClick={async()=>{ try{ setConnect(c=>({ ...c, loading:true, error:null })); const r = await fetch('/api/stripe/connect/status', { method:'POST' }); const j = await r.json(); if(!r.ok) throw new Error(j.message||'Error'); setConnect(c=>({ ...c, ...j, loading:false })); } catch(e){ setConnect(c=>({ ...c, loading:false, error:e.message })); } }} className={`px-3 py-2 rounded ${connect.loading ? 'bg-gray-600' : 'bg-gray-700 hover:bg-gray-600'}`}>Revisar estado</button>
          )}
        </div>
        {connect.error && <div className="text-xs text-red-400 mt-2">{connect.error}</div>}
        <div className="text-xs text-gray-500 mt-2">Tu comisión de plataforma actual es 3%.</div>
      </div>
      {current?.priceId && (
        <p className="text-sm text-gray-400 mb-2">{t('currentPrice')}: {current.priceId}</p>
      )}
      <form onSubmit={save} className="space-y-3">
        <div>
          <label className="block text-sm text-gray-300 mb-1">{t('monthlyPrice')}</label>
          <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="9.99" className="w-full p-2 bg-gray-800 border border-gray-700 rounded" />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-1">{t('currencyLabel')}</label>
          <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full p-2 bg-gray-800 border border-gray-700 rounded">
            <option value="usd">USD</option>
            <option value="eur">EUR</option>
            <option value="clp">CLP</option>
          </select>
        </div>
        <button disabled={loading} className={`px-4 py-2 rounded ${loading ? 'bg-gray-600' : 'bg-pink-600 hover:bg-pink-700'}`}>{loading ? t('saving') : t('save')}</button>
      </form>
      {message && <p className="mt-3">{message}</p>}

      <hr className="my-6 border-gray-700" />
      <form onSubmit={savePlans} className="space-y-4">
        <h2 className="text-xl font-semibold">{t('plansTitle')}</h2>
        <p className="text-sm text-gray-400">{t('plansHelp')}</p>

        {[
          { key: 'day_1', label: t('daily') || 'Diario' },
          { key: 'week_1', label: t('weekly') },
          { key: 'month_1', label: t('monthly') },
          { key: 'month_3', label: t('quarterly') },
          { key: 'month_6', label: t('semiannual') },
          { key: 'year_1', label: t('annual') },
        ].map(({ key, label }) => (
          <div key={key} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-sm text-gray-300 mb-1">{label} - {t('amount')}</label>
              <input value={plans[key].amount} onChange={e=>setPlans(p=>({ ...p, [key]: { ...p[key], amount: e.target.value } }))} placeholder="9.99" className="w-full p-2 bg-gray-800 border border-gray-700 rounded" />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">{t('introDiscountOnce')}</label>
              <input value={plans[key].introPercent} onChange={e=>setPlans(p=>({ ...p, [key]: { ...p[key], introPercent: e.target.value } }))} placeholder="0" className="w-full p-2 bg-gray-800 border border-gray-700 rounded" />
            </div>
            <div className="text-sm text-gray-400">{t('createCouponHelp')}</div>
          </div>
        ))}

        <button disabled={savingPlans} className={`px-4 py-2 rounded ${savingPlans ? 'bg-gray-600' : 'bg-pink-600 hover:bg-pink-700'}`}>{savingPlans ? t('saving') : t('savePlans')}</button>
      </form>
    </div>
  );
}
