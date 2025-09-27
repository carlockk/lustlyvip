'use client';

import { useEffect, useRef } from 'react';
import { MdClose } from 'react-icons/md';
import PoliticsContent from '@/app/components/PoliticsContent';

export default function PoliciesPanel({ open, onClose }) {
  const panelRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!open) return;
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        onClose?.();
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape' && open) {
        onClose?.();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, onClose]);

  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div
        className={`absolute inset-0 bg-black/60 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={() => onClose?.()}
      />
      <aside
        ref={panelRef}
        className={`panel-dark absolute top-0 right-0 h-full w-full max-w-xl bg-gray-900 border-l border-gray-800 text-gray-100 shadow-2xl transform transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-modal="true"
        aria-label="Políticas del servicio"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-xl font-semibold">Políticas del servicio</h2>
          <button
            type="button"
            onClick={() => onClose?.()}
            className="p-2 rounded-full text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
            aria-label="Cerrar"
          >
            <MdClose className="text-2xl" />
          </button>
        </div>
        <div className="h-[calc(100%-72px)] overflow-y-auto px-6 py-6">
          <PoliticsContent showReturnButtons={false} />
        </div>
      </aside>
    </div>
  );
}
