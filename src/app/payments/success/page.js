// src/app/payments/success/page.js

"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { t } = useLanguage();
  const [confirming, setConfirming] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const sid = params.get('session_id');
        if (sid) {
          await fetch(`/api/stripe/checkout/confirm?session_id=${encodeURIComponent(sid)}`);
        }
      } catch {}
      finally {
        setConfirming(false);
        const redirect = params.get('redirect');
        if (redirect) {
          const url = `${redirect}${redirect.includes('?') ? '&' : '?'}refresh=1`;
          router.replace(url);
        }
      }
    })();
  }, [params, router]);

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-lg bg-gray-800 border border-gray-700 rounded-xl p-6 text-center">
        <h1 className="text-2xl font-bold mb-2">{t('paymentSuccessTitle')}</h1>
        <p className="text-gray-400">{t('paymentSuccessBody')}</p>
        {confirming && <div className="text-xs text-gray-500 mt-2">Confirmando pago...</div>}
        <div className="mt-4">
          <button onClick={() => {
            const redirect = params.get('redirect');
            if (redirect) {
              const url = `${redirect}${redirect.includes('?') ? '&' : '?'}refresh=1`;
              router.replace(url);
            } else {
              router.replace('/');
            }
          }} className="px-4 py-2 bg-pink-600 hover:bg-pink-700 rounded">{t('back')}</button>
        </div>
      </div>
    </div>
  );
}
