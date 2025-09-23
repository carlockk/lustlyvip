'use client';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Sidebar from './Sidebar';      // usa tu componente existente
import OverlaysClient from './OverlaysClient';

export default function AppShellClient({ children }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  // Mostrar sidebar SOLO si:
  // - hay sesión autenticada
  // - y NO estamos en /auth/*
  const showSidebar =
    status === 'authenticated' &&
    !!session?.user?.id &&
    !(pathname || '').startsWith('/auth');

  return (
    <div className="flex min-h-screen">
      {showSidebar ? <Sidebar /> : null}

      {/* aplica ml-64 solo cuando el sidebar está presente */}
      <div className={`flex-1 overflow-y-auto pt-12 md:pt-0 ${showSidebar ? 'md:ml-64' : ''}`}>
        {children}
        <OverlaysClient />
      </div>
    </div>
  );
}
