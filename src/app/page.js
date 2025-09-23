'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function HomeRedirect() {
  const { status } = useSession();
  const router = useRouter();
  const sp = useSearchParams();
  const cb = sp?.get('callbackUrl'); // por si vienen desde middleware

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'authenticated') {
      router.replace('/explore'); // o '/feed' si tienes un feed
    } else {
      const target = cb || '/';
      router.replace(`/auth/login?callbackUrl=${encodeURIComponent(target)}`);
    }
  }, [status, router, cb]);

  return null;
}
