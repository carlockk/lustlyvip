'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FaImage } from 'react-icons/fa';

export default function NewPost({ autoFocus = false, showHeader = true, className = '' }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [text, setText] = useState('');
  const [isExclusive, setIsExclusive] = useState(false);
  const [ppvEnabled, setPpvEnabled] = useState(false);
  const [ppvPrice, setPpvPrice] = useState('');
  const [ppvCurrency, setPpvCurrency] = useState('usd');
  const [media, setMedia] = useState(null);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (autoFocus) {
      setTimeout(() => {
        try { textareaRef.current?.focus(); } catch {}
      }, 0);
    }
  }, [autoFocus]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('Publicando...');
    setIsError(false);

    if (!session) {
      setMessage('Debes iniciar sesión para publicar.');
      setIsError(true);
      return;
    }

    if (!text.trim() && !media) {
      setMessage('El contenido de la publicación o un archivo multimedia es obligatorio.');
      setIsError(true);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('text', text);
      formData.append('isExclusive', isExclusive);
      formData.append('ppvEnabled', ppvEnabled && isExclusive);
      if (ppvEnabled && isExclusive) {
        const cents = Math.round(parseFloat(ppvPrice || '0') * 100);
        if (!Number.isFinite(cents) || cents <= 0) {
          setMessage('Precio PPV inválido.');
          setIsError(true);
          return;
        }
        formData.append('ppvAmountCents', String(cents));
        formData.append('ppvCurrency', ppvCurrency);
      }
      if (media) {
        formData.append('media', media);
      }

      const res = await fetch('/api/posts', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setMessage('¡Publicación creada con éxito!');
        setText('');
        setIsExclusive(false);
        setPpvEnabled(false);
        setPpvPrice('');
        setPpvCurrency('usd');
        setMedia(null);
        router.refresh();
      } else {
        setMessage(data.message || 'Error al crear la publicación.');
        setIsError(true);
      }
    } catch (error) {
      console.error('Error de red:', error);
      setMessage('Error de conexión. Inténtalo de nuevo.');
      setIsError(true);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMedia(file);
    }
  };

  const canPublish = Boolean(text.trim()) || Boolean(media);
  const containerClass = [
    'bg-gray-800 p-6 rounded-lg shadow-lg max-w-2xl mx-auto mb-8',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClass}>
      {showHeader && <h2 className="text-2xl font-bold mb-4">Crea una nueva publicación:</h2>}
      <form onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          className="w-full h-24 p-2 mb-4 bg-gray-700 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-pink-500"
          placeholder="Escribe tu nueva publicación..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          required={!media}
        />

        {media && (
          <div className="mb-4 text-gray-400">
            Archivo seleccionado: {media.name}
          </div>
        )}

        <div className="flex items-center space-x-4 mb-4">
          <label
            htmlFor="file-upload"
            className="flex items-center px-4 py-2 bg-gray-700 text-gray-300 rounded-full cursor-pointer hover:bg-gray-600 transition-colors"
          >
            <FaImage className="mr-2" />
            Foto/Video
          </label>
          <input
            id="file-upload"
            type="file"
            className="hidden"
            accept="image/*,video/*"
            onChange={handleFileChange}
          />
        </div>

        <div className="flex items-center mb-4">
          <input
            id="exclusive"
            type="checkbox"
            checked={isExclusive}
            onChange={(e) => setIsExclusive(e.target.checked)}
            className="form-checkbox h-5 w-5 text-pink-600 bg-gray-700 border-gray-600 rounded focus:ring-pink-500"
          />
          <label htmlFor="exclusive" className="ml-2 text-gray-300">
            Contenido exclusivo para suscriptores
          </label>
        </div>

        {isExclusive && (
          <div className="mb-4 p-4 rounded-md bg-gray-800 border border-gray-700">
            <div className="flex items-center mb-3">
              <input
                id="ppvEnabled"
                type="checkbox"
                checked={ppvEnabled}
                onChange={(e) => setPpvEnabled(e.target.checked)}
                className="form-checkbox h-5 w-5 text-pink-600 bg-gray-700 border-gray-600 rounded focus:ring-pink-500"
              />
              <label htmlFor="ppvEnabled" className="ml-2 text-gray-300">
                Permitir compra PPV para no suscriptores
              </label>
            </div>

            {ppvEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-sm text-gray-400 mb-1">Precio</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.5"
                    placeholder="Ej: 4.99"
                    value={ppvPrice}
                    onChange={(e) => setPpvPrice(e.target.value)}
                    className="w-full p-2 bg-gray-700 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Moneda</label>
                  <select
                    value={ppvCurrency}
                    onChange={(e) => setPpvCurrency(e.target.value)}
                    className="w-full p-2 bg-gray-700 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  >
                    <option value="usd">USD</option>
                    <option value="clp">CLP</option>
                  </select>
                </div>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">Sugerencia: en USD el mínimo es 0.50. En CLP, 500. La plataforma aplicará una comisión configurable.</p>
          </div>
        )}

        <div className="flex justify-end items-center">
          {message && (
            <span className={`text-sm mr-4 ${isError ? 'text-red-500' : 'text-green-500'}`}>
              {message}
            </span>
          )}
          <button
            type="submit"
            disabled={!canPublish}
            className="py-2 px-4 rounded-full font-bold text-white bg-pink-600 hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Publicar
          </button>
        </div>
      </form>
    </div>
  );
}
