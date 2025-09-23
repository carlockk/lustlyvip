"use client";

import { useState } from 'react';
import { useLanguage } from '@/lib/i18n';

export default function ConfirmDeleteAccountModal({ open, onClose, onDeleted }) {
  const { t } = useLanguage();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleConfirm = async () => {
    setError('');
    if (!password) { setError(t('enterPasswordToConfirm') || ''); return; }
    try {
      setLoading(true);
      const r = await fetch('/api/me/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.message || t('deleteAccountError') || '');
      alert(t('accountDeleted') || 'Cuenta eliminada');
      onDeleted && onDeleted();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={() => !loading && onClose && onClose()} />
      <div className="relative z-10 w-full max-w-md rounded-lg border border-gray-700 bg-gray-800 p-5">
        <div className="text-lg font-semibold mb-1 text-red-400">{t('deleteAccount') || 'Eliminar cuenta'}</div>
        <p className="text-xs text-gray-400 mb-3">{t('deleteAccountDesc') || 'Esta acción es permanente y eliminará tu perfil, publicaciones, mensajes y suscripciones.'}</p>
        <label className="block text-sm text-gray-300 mb-1">{t('enterPasswordToConfirm') || 'Ingresa tu contraseña para confirmar'}</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 rounded bg-gray-700 border border-gray-600 mb-2"
          disabled={loading}
        />
        {error && <div className="text-xs text-red-400 mb-2">{error}</div>}
        <div className="flex justify-end gap-2">
          <button
            onClick={() => onClose && onClose()}
            disabled={loading}
            className="px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-sm"
          >
            {t('cancel') || 'Cancelar'}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`px-3 py-2 rounded text-sm ${loading ? 'bg-red-700' : 'bg-red-600 hover:bg-red-700'}`}
          >
            {loading ? (t('deleting') || 'Eliminando...') : (t('confirm') || 'Confirmar')}
          </button>
        </div>
      </div>
    </div>
  );
}

