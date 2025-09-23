'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import NewPost from './NewPost';
import { MdAdd } from 'react-icons/md';

export default function GlobalNewPostPanel() {
  const { data: session } = useSession();
  const [isCreator, setIsCreator] = useState(false);
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const toggleRef = useRef(null);
  const focusablesRef = useRef([]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!session) { if (active) setIsCreator(false); return; }
        const r = await fetch('/api/me/flags');
        const j = await r.json();
        if (active) setIsCreator(!!j.isCreator);
      } catch { if (active) setIsCreator(false); }
    })();
    return () => { active = false; };
  }, [session]);

  // Cerrar al hacer clic fuera y con ESC; gestionar focus al abrir
  useEffect(() => {
    const handler = (e) => {
      if (!open) return;
      const panel = panelRef.current;
      const toggle = toggleRef.current;
      if (panel && !panel.contains(e.target) && (!toggle || !toggle.contains(e.target))) {
        setOpen(false);
      }
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', onKey); };
  }, [open]);

  // Focus inicial y trap de foco dentro del diálogo
  useEffect(() => {
    if (!open) return;
    // Recolectar elementos enfocables dentro del panel
    const panel = panelRef.current;
    if (!panel) return;
    const selectors = [
      'a[href]', 'button:not([disabled])', 'textarea', 'input', 'select', '[tabindex]:not([tabindex="-1"])'
    ];
    const nodes = Array.from(panel.querySelectorAll(selectors.join(',')));
    focusablesRef.current = nodes.filter((el) => el.offsetParent !== null);
    // Intentar enfocar textarea del compositor si existe
    setTimeout(() => {
      const ta = panel.querySelector('textarea');
      if (ta) { try { ta.focus(); } catch {} return; }
      const first = focusablesRef.current[0];
      if (first) { try { first.focus(); } catch {} }
    }, 0);
  }, [open]);

  const onKeyDownTrap = (e) => {
    if (!open || e.key !== 'Tab') return;
    const els = focusablesRef.current;
    if (!els || els.length === 0) return;
    const first = els[0];
    const last = els[els.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  };

  if (!session || !isCreator) return null;

  return (
    <>
      {/* Botón flotante separado del chat */}
      <button
        ref={toggleRef}
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-24 right-4 z-50 p-3 rounded-full bg-pink-600 hover:bg-pink-700 text-white shadow-lg"
        aria-label="Crear publicación"
      >
        <MdAdd className="w-7 h-7" />
      </button>

      {/* Panel deslizante */}
      <div className={`fixed inset-0 z-40 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
        <div className={`absolute inset-0 bg-black/40 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} />
        <div
          ref={panelRef}
          className={`absolute top-0 right-0 h-full w-full max-w-lg bg-gray-900 border-l border-gray-800 text-gray-100 transform transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}
          role="dialog"
          aria-label="Panel crear publicación"
          aria-modal="true"
          onKeyDown={onKeyDownTrap}
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <h3 className="text-lg font-semibold">Nueva publicación</h3>
            <button onClick={() => setOpen(false)} aria-label="Cerrar" className="px-2 py-1 rounded hover:bg-gray-800 text-gray-300">✕</button>
          </div>
          <div className="p-4 overflow-y-auto h-[calc(100%-56px)]">
            <NewPost autoFocus />
          </div>
        </div>
      </div>
    </>
  );
}
