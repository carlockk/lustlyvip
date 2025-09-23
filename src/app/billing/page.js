// src/app/billing/page.js

'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/lib/i18n';

export default function BillingPage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [methods, setMethods] = useState([]);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);

  const fetchMethods = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/payment-methods');
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error');
      setMethods(data.paymentMethods || []);
      const def = (data.paymentMethods || []).find(m => m.is_default);
      setSelected(def?.id || null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMethods(); }, []);

  const setDefault = async () => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/payment-methods', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultPaymentMethodId: selected })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error');
      await fetchMethods();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const openPortal = async () => {
    try {
      const endpoint = process.env.NODE_ENV === 'production' ? '/api/stripe/portal' : '/api/stripe/portal/dev';
      const res = await fetch(endpoint, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || t('openStripePortal'));
      window.location.href = data.url;
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">{t('billingTitle')}</h1>
      <p className="text-gray-400 mb-4">{t('billingDesc')}</p>
      <div className="mb-4">
        <button onClick={openPortal} className="px-4 py-2 bg-pink-600 hover:bg-pink-700 rounded text-white">{t('openStripePortal')}</button>
      </div>
      {loading ? (
        <p>{t('loadingMethods')}</p>
      ) : (
        <div className="space-y-2">
          {methods.length === 0 && <p className="text-gray-400">{t('noCards')}</p>}
          {methods.map(m => (
            <label key={m.id} className="flex items-center justify-between bg-gray-800 border border-gray-700 rounded p-3">
              <div>
                <div className="font-semibold capitalize">{m.brand} •••• {m.last4}</div>
                <div className="text-sm text-gray-400">Exp {m.exp_month}/{m.exp_year}</div>
              </div>
              <input type="radio" name="default" checked={selected === m.id} onChange={() => setSelected(m.id)} />
            </label>
          ))}
          {methods.length > 0 && (
            <button disabled={saving} onClick={setDefault} className={`px-4 py-2 rounded ${saving ? 'bg-gray-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
              {saving ? t('saving') : t('saveDefault')}
            </button>
          )}
        </div>
      )}
      {error && <p className="text-red-400 mt-4">{error}</p>}
    </div>
  );
}

