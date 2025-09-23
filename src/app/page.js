// app/page.js
"use client";

import { Suspense, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// --- Componente hijo que usa useSearchParams ---
function HomeInner() {
  const { status, data: session } = useSession();
  const router = useRouter();
  const sp = useSearchParams();

  const callbackUrl = useMemo(() => sp.get("callbackUrl") || "/explore", [sp]);

  useEffect(() => {
    if (status === "loading") return;

    if (status === "authenticated") {
      router.replace("/explore");
    } else {
      router.replace(`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
  }, [status, session, router, callbackUrl]);

  return null;
}

// --- Página raíz con Suspense como padre ---
export default function Home() {
  return (
    <Suspense fallback={<div className="p-6">Cargando…</div>}>
      <HomeInner />
    </Suspense>
  );
}
