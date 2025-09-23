'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/i18n';

export default function NotificationsPage() {
  const { t } = useLanguage();
  return (
    <div className="min-h-[60vh] px-6 py-10 text-white">
      <h1 className="text-2xl font-bold mb-4">{t('notificationsTitleFull')}</h1>
      <p className="text-gray-400 mb-6">{t('notificationsEmpty')}</p>
      <div className="text-sm text-gray-500">
        {t('notificationsHint')} <Link className="text-pink-500 hover:underline" href="/">{t('home')}</Link> {t('or')} <Link className="text-pink-500 hover:underline" href="/messages">{t('messages')}</Link>.
      </div>
    </div>
  );
}

