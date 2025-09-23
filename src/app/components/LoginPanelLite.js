'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPanelLite() {
  const search = useSearchParams();
  const router = useRouter();
  const next = search.get('next') || '/';

  return (
    <div className="w-full max-w-md backdrop-blur-md bg-black/40 text-white rounded-none md:rounded-l-3xl md:rounded-tr-none p-6 md:p-8 md:ml-auto border border-white/10">
      <h2 className="text-2xl font-semibold mb-2">Bienvenido</h2>
      <p className="text-sm text-white/80 mb-6">Inicia sesión para suscribirte y ver contenido.</p>
      <div className="space-y-3">
        <button
          className="w-full py-3 rounded-xl bg-pink-600 hover:bg-pink-500 font-medium"
          onClick={() => signIn(undefined, { callbackUrl: next })}
        >
          Iniciar sesión
        </button>
        <p className="text-sm text-center text-white/80">
          ¿No tienes cuenta?{" "}
          <Link href={`/auth/register?next=${encodeURIComponent(next)}`} className="underline">Crea una</Link>
        </p>
      </div>
    </div>
  );
}
