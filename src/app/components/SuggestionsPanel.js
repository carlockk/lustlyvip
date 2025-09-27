// src/app/components/SuggestionsPanel.js
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { cloudinaryLoader } from '@/lib/cloudinaryLoader';
import { useSession } from 'next-auth/react';
import { MdClose } from 'react-icons/md';

export default function SuggestionsPanel({ open, onClose }) {
  const { data: session } = useSession();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const panelRef = useRef(null);
  const [internalOpen, setInternalOpen] = useState(open);

  const effectiveOpen = open ?? internalOpen;

  const fetchSuggestions = async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/suggestions?userId=${session?.user?.id}`);
      if (!res.ok) throw new Error('Error al cargar las sugerencias.');
      const data = await res.json();
      const users = data.users || [];
      setSuggestions(users);
      // Auto-abrir si hay nuevas sugerencias no vistas
      try {
        const seen = JSON.parse(localStorage.getItem('suggestionsSeenIds') || '[]');
        const newOnes = users.some(u => !seen.includes(u._id));
        if (newOnes) setInternalOpen(true);
      } catch {/* noop */}
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session !== undefined) fetchSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    if (open !== undefined) setInternalOpen(open);
  }, [open]);

  // cerrar al hacer click fuera
  useEffect(() => {
    const handler = (e) => {
      if (!effectiveOpen) return;
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose ? onClose() : setInternalOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [effectiveOpen, onClose]);

  const handleClose = () => {
    // Marcar como vistas las sugerencias actuales
    try {
      const ids = suggestions.map(u => u._id);
      localStorage.setItem('suggestionsSeenIds', JSON.stringify(ids));
    } catch {/* noop */}
    onClose ? onClose() : setInternalOpen(false);
  };

  return (
    <div className={`fixed inset-0 z-40 ${effectiveOpen ? '' : 'pointer-events-none'}`}>
      {/* overlay */}
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity ${effectiveOpen ? 'opacity-100' : 'opacity-0'}`}
      />
      {/* panel */}
      <div
        ref={panelRef}
        className={`panel-dark absolute top-0 right-0 h-full w-full max-w-md bg-gray-900 border-l border-gray-800 text-gray-100 transform transition-transform duration-300 ${effectiveOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
  <h3 className="text-xl font-bold leading-tight text-gray-100">
    Nuevos creadores
  </h3>
          <button
            aria-label="Cerrar"
            onClick={handleClose}
            className="text-gray-300 hover:text-white cursor-pointer"
          >
            <MdClose className="text-2xl" />
          </button>
        </div>

        {/* contenido */}
        <div className="p-4 space-y-4 overflow-y-auto h-[calc(100%-56px)]">
          {loading && <div className="text-gray-400">Cargando…</div>}
          {error && <div className="text-red-400">{error}</div>}
          {!loading && !error && suggestions.length === 0 && (
            <div className="text-gray-400">No hay sugerencias por ahora.</div>
          )}

          {suggestions.map((u) => {
            const cover = u.coverPhoto || '/images/placeholder-cover.jpg';
            const avatar = u.profilePicture || '/images/placeholder-avatar.png';
            return (
              <div
                key={u._id}
                className="rounded-xl overflow-hidden border border-gray-800 bg-gray-900/70 hover:bg-gray-800 transition-colors shadow-sm"
              >
                {/* Cover grande: casi todo el ancho del panel */}
                <div className="relative w-full aspect-[16/9]">
                  <Image
                    loader={cloudinaryLoader}
                    src={cover}
                    alt={`Portada de @${u.username}`}
                    fill
                    sizes="384px"        // ~ max-w-md
                    className="object-cover"
                    priority={false}
                  />
                </div>

                {/* Avatar grande superpuesto */}
                <div className="px-4 -mt-8 flex items-center">
                  <div className="relative w-20 h-20 rounded-full ring-4 ring-gray-900 overflow-hidden shrink-0">
                    <Image
                      loader={cloudinaryLoader}
                      src={avatar}
                      alt={u.username}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>

                  <div className="ml-3 min-w-0">
                    <Link
                      href={`/profile/${u._id}`}
                      className="block font-semibold text-sm text-white hover:underline truncate"
                      title={`@${u.username}`}
                      onClick={handleClose}
                    >
                      @{u.username}
                    </Link>
                    {u.bio ? (
                      <div className="text-[11px] text-gray-400 line-clamp-2">{u.bio}</div>
                    ) : (
                      <div className="text-[11px] text-gray-500">Creador</div>
                    )}
                  </div>
                </div>

                {/* CTA */}
                <div className="px-4 pt-3 pb-4">
                  <Link
                    href={`/profile/${u._id}`}
                    onClick={handleClose}
                    className="inline-flex items-center justify-center w-full text-xs font-semibold px-3 py-2 rounded-lg bg-pink-600 hover:bg-pink-700 transition-colors"
                  >
                    Ver perfil
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

