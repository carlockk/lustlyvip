// src/app/payments/cancel/page.js

import { useLanguage } from '@/lib/i18n';

export default function PaymentCancelPage() {
  const { t } = useLanguage();
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-lg bg-gray-800 border border-gray-700 rounded-xl p-6 text-center">
        <h1 className="text-2xl font-bold mb-2">{t('paymentCancelTitle')}</h1>
        <p className="text-gray-400">{t('paymentCancelBody')}</p>
      </div>
    </div>
  );
}
