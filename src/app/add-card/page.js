// src/app/add-card/page.js

'use client';

import { useState } from 'react';
import { useLanguage } from '@/lib/i18n';

export default function AddCardPage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const openPortal = async () => {
    try {
      setLoading(true);
      setError(null);
      const endpoint = process.env.NODE_ENV === 'production' ? '/api/stripe/portal' : '/api/stripe/portal/dev';
      const res = await fetch(endpoint, { method: 'POST' });
      let data = null;
      try { data = await res.json(); } catch (_) {}
      if (!res.ok) {
        throw new Error((data && data.message) || t('openStripePortal'));
      }
      if (!data || !data.url) throw new Error('No URL');
      window.location.href = data.url;
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-md bg-gray-800 border border-gray-700 rounded-xl p-6">
        <h1 className="text-2xl font-bold mb-2">{t('addCardTitleFull')}</h1>
        <p className="text-gray-400 mb-6">{t('addCardDesc')}</p>
        <button
          onClick={openPortal}
          disabled={loading}
          className={`w-full py-2 rounded-lg font-semibold transition-colors ${loading ? 'bg-gray-600' : 'bg-pink-600 hover:bg-pink-700'}`}
        >
          {loading ? t('opening') : t('openPaymentPortal')}
        </button>
        {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
      </div>
    </div>
  );
}

