"use client";

import dynamic from 'next/dynamic';

// Cargamos paneles pesados con ssr: false dentro de un Client Component
const ChatPanel = dynamic(() => import('./ChatPanel'), { ssr: false, loading: () => null });
const GlobalNewPostPanel = dynamic(() => import('./GlobalNewPostPanel'), { ssr: false, loading: () => null });

export default function OverlaysClient() {
  return (
    <>
      <ChatPanel />
      <GlobalNewPostPanel />
    </>
  );
}

