// src/app/subscriptions/page.js

'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n';

export default function SubscriptionsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { t } = useLanguage();
    const [subscriptions, setSubscriptions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/login');
        }

        if (status === 'authenticated') {
            const fetchSubscriptions = async () => {
                try {
                    const res = await fetch('/api/subscriptions');
                    if (!res.ok) { throw new Error(t('subscriptionsLoading')); }
                    const data = await res.json();
                    setSubscriptions(data.subscriptions);
                } catch (e) {
                    console.error('Error fetching subscriptions:', e);
                    setError(e.message);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchSubscriptions();
        }
    }, [status, router, t]);

    if (isLoading || status === 'loading') {
        return <div className="flex flex-1 items-center justify-center text-gray-100">{t('subscriptionsLoading')}</div>;
    }

    if (error) {
        return <div className="flex flex-1 items-center justify-center text-gray-100">{error}</div>;
    }

    return (
        <div className="flex flex-col flex-1 p-8">
            <div className="max-w-4xl mx-auto w-full">
                <h1 className="text-4xl font-bold mb-6">{t('subscriptionsTitle')}</h1>

                {subscriptions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {subscriptions.map((sub) => (
                            <Link href={`/profile/${sub.creatorId._id}`} key={sub._id}>
                                <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden cursor-pointer hover:bg-gray-700 transition-colors">
                                    <div className="relative h-32">
                                        <img
                                            src={sub.creatorId.coverPhoto || '/images/placeholder-cover.jpg'}
                                            alt="Cover"
                                            className="w-full h-full object-cover"
                                        />
                                        <img
                                            src={sub.creatorId.profilePicture || '/images/placeholder-avatar.png'}
                                            alt="Profile"
                                            className="absolute -bottom-8 left-4 w-16 h-16 rounded-full border-4 border-gray-900 object-cover"
                                        />
                                    </div>
                                    <div className="p-4 pt-10">
                                        <h2 className="text-xl font-bold">@{sub.creatorId.username}</h2>
                                        <p className="text-sm text-gray-400 mt-2">{t('subscribedSince')}: {new Date(sub.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-gray-400">{t('subscriptionsEmpty')}</div>
                )}
            </div>
        </div>
    );
}
