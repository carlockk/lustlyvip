'use client';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Sidebar from './Sidebar';
import OverlaysClient from './OverlaysClient';

export default function AppShellClient({ children }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  const showSidebar =
    status === 'authenticated' &&
    !!session?.user?.id &&
    !(pathname || '').startsWith('/auth');

  return (
    <div className="flex min-h-screen">
      {showSidebar ? <Sidebar /> : null}

      <div className={`flex-1 overflow-y-auto pt-12 md:pt-0 ${showSidebar ? 'md:ml-64' : ''}`}>
        {children}
        <OverlaysClient />
      </div>
    </div>
  );
}
