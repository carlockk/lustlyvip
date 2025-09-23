// src/app/posts/[id]/page.js
'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useRef, useMemo, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/lib/i18n';

// añadidos para vista pública
import PublicTopbar from '@/app/components/PublicTopbar';
import PublicSuggestionsRail from '@/app/components/PublicSuggestionsRail';

function PostDetailInner() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();
  const { t, lang } = useLanguage();
  const { id } = params;
  const searchParams = useSearchParams();

  const [post, setPost] = useState(null);
  const [access, setAccess] = useState(null);
  const [prevNext, setPrevNext] = useState({ prevId: null, nextId: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const topRef = useRef(null);
  const [prevMeta, setPrevMeta] = useState(null);
  const [nextMeta, setNextMeta] = useState(null);
  const [showPrevTip, setShowPrevTip] = useState(false);
  const [showNextTip, setShowNextTip] = useState(false);

  const dtf = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(lang || 'es', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return null;
    }
  }, [lang]);

  const fmtPrice = (cents, cur = 'usd') => {
    const C = (cur || 'usd').toUpperCase();
    return C === 'CLP' ? `${cents} CLP` : `$${(cents / 100).toFixed(2)} USD`;
  };

  useEffect(() => {
    (async () => {
      try {
        const [pRes, aRes] = await Promise.all([
          fetch(`/api/posts/${id}`, { cache: 'no-store' }),
          fetch(`/api/access/post/${id}`, { cache: 'no-store' }),
        ]);
        const p = await pRes.json();
        if (!pRes.ok) throw new Error(p.message || (t('postLoadError') || ''));
        setPost(p.post);
        setPrevNext({ prevId: p.prevId || null, nextId: p.nextId || null });
        setPrevMeta(p.prev || null);
        setNextMeta(p.next || null);
        const a = await aRes.json();
        setAccess(a);

        // analytics (view)
        try {
          const anonKey = 'lustly_anon_id';
          let anonId = null;
          try {
            anonId = localStorage.getItem(anonKey);
            if (!anonId) {
              anonId = (crypto?.randomUUID
                ? crypto.randomUUID()
                : `${Date.now()}_${Math.random().toString(36).slice(2)}`);
              localStorage.setItem(anonKey, anonId);
            }
          } catch {}
          const payload = JSON.stringify({
            postId: id,
            creatorId: p.post.creator?._id || p.post.creator,
            anonymousId: anonId,
          });
          if (navigator.sendBeacon) {
            const blob = new Blob([payload], { type: 'application/json' });
            navigator.sendBeacon('/api/analytics/views', blob);
          } else {
            fetch('/api/analytics/views', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: payload,
            });
          }
        } catch {}
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, t]);

  useEffect(() => {
    try {
      if (searchParams?.get('autoscroll') && topRef.current) {
        setTimeout(() => {
          try {
            topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } catch {}
        }, 50);
      }
    } catch {}
  }, [searchParams]);

  useEffect(() => {
    const onKey = (e) => {
      if (!post) return;
      if (e.key === 'ArrowLeft' && prevNext.prevId) {
        e.preventDefault();
        router.push(`/posts/${prevNext.prevId}?autoscroll=1`);
      } else if (e.key === 'ArrowRight' && prevNext.nextId) {
        e.preventDefault();
        router.push(`/posts/${prevNext.nextId}?autoscroll=1`);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router, prevNext, post]);

  const subscribe = async (creatorId) => {
    try {
      const priceRes = await fetch(`/api/creators/${creatorId}/price`, { cache: 'no-store' });
      const priceData = await priceRes.json();
      if (!priceRes.ok || !priceData.priceId) {
        try {
          await fetch(`/api/favorites/${creatorId}`, { method: 'POST' });
        } catch {}
        alert(t('addedToFavorites') || '');
        return;
      }
      const res = await fetch('/api/stripe/checkout/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId, priceId: priceData.priceId }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.message || (t('checkoutStartError') || ''));
      window.location.href = data.url;
    } catch (e) {
      alert(e.message);
    }
  };

  const buyPPV = async () => {
    try {
      const res = await fetch('/api/stripe/checkout/ppv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: id }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.message || (t('paymentStartError') || ''));
      window.location.href = data.url;
    } catch (e) {
      alert(e.message);
    }
  };

  if (loading || status === 'loading') return <div className="p-6">{t('loadingGeneric')}</div>;
  if (error) return <div className="p-6 text-red-400">{error}</div>;
  if (!post) return null;

  const exclusiveLocked = post.isExclusive && access && access.access === false;
  const unauth = !session;

  // ======= VISTA INVITADO =======
  if (unauth) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100">
        <PublicTopbar />

        <div
          ref={topRef}
          className="mx-auto max-w-6xl p-6 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_18rem] gap-6"
        >
          {/* Columna principal */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link
                  href={`/profile/${post.creator?._id || post.creator}`}
                  className="flex items-center gap-2"
                >
                  <img
                    src={post.creator?.profilePicture || '/images/placeholder-avatar.png'}
                    alt="Avatar"
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-400">
                      @{post.creator?.username || 'usuario'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {t('viewProfile') || 'Ver perfil'}
                    </span>
                  </div>
                </Link>
              </div>
              <div className="flex items-center gap-2">
                {prevNext.prevId && (
                  <div
                    className="relative"
                    onMouseEnter={() => setShowPrevTip(true)}
                    onMouseLeave={() => setShowPrevTip(false)}
                    onFocus={() => setShowPrevTip(true)}
                    onBlur={() => setShowPrevTip(false)}
                  >
                    <Link
                      href={`/posts/${prevNext.prevId}?autoscroll=1`}
                      className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700 text-sm"
                    >
                      {t('previous') || 'Anterior'}
                    </Link>
                    {showPrevTip && prevMeta && (
                      <div className="absolute top-full mt-2 left-0 w-72 bg-gray-900 border border-gray-700 rounded shadow-lg p-3 z-10">
                        {prevMeta.imageUrl && (
                          <img
                            src={prevMeta.imageUrl}
                            alt="Prev"
                            className="w-full h-24 object-cover rounded mb-2"
                          />
                        )}
                        {prevMeta.text && (
                          <div className="text-xs text-gray-300">
                            {(prevMeta.text || '').slice(0, 100)}
                            {(prevMeta.text || '').length > 100 ? '…' : ''}
                          </div>
                        )}
                        <div className="text-[11px] text-gray-500 mt-1">
                          {dtf
                            ? dtf.format(new Date(prevMeta.createdAt))
                            : new Date(prevMeta.createdAt).toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {prevNext.nextId && (
                  <div
                    className="relative"
                    onMouseEnter={() => setShowNextTip(true)}
                    onMouseLeave={() => setShowNextTip(false)}
                    onFocus={() => setShowNextTip(true)}
                    onBlur={() => setShowNextTip(false)}
                  >
                    <Link
                      href={`/posts/${prevNext.nextId}?autoscroll=1`}
                      className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700 text-sm"
                    >
                      {t('next') || 'Siguiente'}
                    </Link>
                    {showNextTip && nextMeta && (
                      <div className="absolute top-full mt-2 right-0 w-72 bg-gray-900 border border-gray-700 rounded shadow-lg p-3 z-10">
                        {nextMeta.imageUrl && (
                          <img
                            src={nextMeta.imageUrl}
                            alt="Next"
                            className="w-full h-24 object-cover rounded mb-2"
                          />
                        )}
                        {nextMeta.text && (
                          <div className="text-xs text-gray-300">
                            {(nextMeta.text || '').slice(0, 100)}
                            {(nextMeta.text || '').length > 100 ? '…' : ''}
                          </div>
                        )}
                        <div className="text-[11px] text-gray-500 mt-1">
                          {dtf
                            ? dtf.format(new Date(nextMeta.createdAt))
                            : new Date(nextMeta.createdAt).toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
              {(() => {
                const imgRe = /\.(jpeg|jpg|gif|png|webp)$/i;
                const mediaUrl = post.videoUrl || post.imageUrl || null;
                if (!mediaUrl) return null;
                const looksVideo = !!(
                  post.videoUrl || (post.imageUrl && !imgRe.test(post.imageUrl))
                );
                return (
                  <div className="mb-4 relative">
                    {looksVideo ? (
                      <video
                        src={mediaUrl}
                        className={`w-full h-auto max-h-[75vh] rounded-lg object-contain ${
                          exclusiveLocked ? 'blur-sm select-none pointer-events-none' : ''
                        }`}
                        controls={!exclusiveLocked}
                        playsInline
                      />
                    ) : (
                      <img
                        src={mediaUrl}
                        alt="Contenido del post"
                        className={`w-full h-auto max-h-[75vh] rounded-lg object-contain ${
                          exclusiveLocked ? 'blur-sm select-none pointer-events-none' : ''
                        }`}
                      />
                    )}
                    {exclusiveLocked && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="px-3 py-1 rounded bg-black/60 text-white text-sm">
                          {t('lockedContent') || 'Contenido bloqueado'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {post.text && !exclusiveLocked && (
                <p className="text-gray-200 whitespace-pre-wrap">{post.text}</p>
              )}

              <p className="text-sm text-gray-400 mt-2">
                {t('publishedOn') || 'Publicado el'}{' '}
                {dtf
                  ? dtf.format(new Date(post.createdAt))
                  : new Date(post.createdAt).toLocaleDateString()}
              </p>

              {exclusiveLocked && (
                <div className="mt-4 flex items-center gap-2">
                  <Link
                    href={`/auth/login?callbackUrl=${encodeURIComponent(`/posts/${id}`)}`}
                    className="px-3 py-2 bg-pink-600 hover:bg-pink-700 rounded"
                  >
                    {t('subscribe') || 'Suscribirse'}
                  </Link>
                  <button
                    onClick={buyPPV}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded"
                  >
                    {fmtPrice(
                      post.ppvAmountCents ||
                        parseInt(process.env.NEXT_PUBLIC_PPV_DEFAULT_CENTS || '500', 10),
                      post.ppvCurrency || 'usd'
                    )}{' '}
                    · {t('buyPpv') || 'Comprar PPV'}
                  </button>
                  <button
                    onClick={async () => {
                      const val = prompt(t('tipAmountPrompt') || '');
                      if (!val) return;
                      const cents = Math.round(parseFloat(String(val).replace(',', '.')) * 100);
                      if (!Number.isFinite(cents) || cents <= 0)
                        return alert(t('invalidAmount') || '');
                      try {
                        const r = await fetch('/api/stripe/checkout/tip', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            creatorId: post.creator?._id || post.creator,
                            amountCents: cents,
                            currency: post.ppvCurrency || 'usd',
                          }),
                        });
                        const j = await r.json();
                        if (!r.ok || !j.url)
                          throw new Error(j.message || (t('paymentStartError') || ''));
                        window.location.href = j.url;
                      } catch (e) {
                        alert(e.message);
                      }
                    }}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded"
                  >
                    {t('leaveTip') || 'Dejar propina'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Rail sugerencias público */}
          <PublicSuggestionsRail limit={8} />
        </div>
      </div>
    );
  }

  // ======= VISTA CON SESIÓN (original) =======
  return (
    <div ref={topRef} className="max-w-3xl mx-auto p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/profile/${post.creator?._id || post.creator}`}
            className="flex items-center gap-2"
          >
            <img
              src={post.creator?.profilePicture || '/images/placeholder-avatar.png'}
              alt="Avatar"
              className="w-10 h-10 rounded-full object-cover"
            />
            <div className="flex flex-col">
              <span className="text-sm text-gray-400">
                @{post.creator?.username || 'usuario'}
              </span>
              <span className="text-xs text-gray-500">{t('viewProfile') || 'Ver perfil'}</span>
            </div>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          {prevNext.prevId && (
            <div
              className="relative"
              onMouseEnter={() => setShowPrevTip(true)}
              onMouseLeave={() => setShowPrevTip(false)}
              onFocus={() => setShowPrevTip(true)}
              onBlur={() => setShowPrevTip(false)}
            >
              <Link
                href={`/posts/${prevNext.prevId}?autoscroll=1`}
                className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700 text-sm"
              >
                {t('previous') || 'Anterior'}
              </Link>
              {showPrevTip && prevMeta && (
                <div className="absolute top-full mt-2 left-0 w-72 bg-gray-900 border border-gray-700 rounded shadow-lg p-3 z-10">
                  {prevMeta.imageUrl && (
                    <img
                      src={prevMeta.imageUrl}
                      alt="Prev"
                      className="w-full h-24 object-cover rounded mb-2"
                    />
                  )}
                  {prevMeta.text && (
                    <div className="text-xs text-gray-300">
                      {(prevMeta.text || '').slice(0, 100)}
                      {(prevMeta.text || '').length > 100 ? '…' : ''}
                    </div>
                  )}
                  <div className="text-[11px] text-gray-500 mt-1">
                    {dtf
                      ? dtf.format(new Date(prevMeta.createdAt))
                      : new Date(prevMeta.createdAt).toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          )}
          {prevNext.nextId && (
            <div
              className="relative"
              onMouseEnter={() => setShowNextTip(true)}
              onMouseLeave={() => setShowNextTip(false)}
              onFocus={() => setShowNextTip(true)}
              onBlur={() => setShowNextTip(false)}
            >
              <Link
                href={`/posts/${prevNext.nextId}?autoscroll=1`}
                className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700 text-sm"
              >
                {t('next') || 'Siguiente'}
              </Link>
              {showNextTip && nextMeta && (
                <div className="absolute top-full mt-2 right-0 w-72 bg-gray-900 border border-gray-700 rounded shadow-lg p-3 z-10">
                  {nextMeta.imageUrl && (
                    <img
                      src={nextMeta.imageUrl}
                      alt="Next"
                      className="w-full h-24 object-cover rounded mb-2"
                    />
                  )}
                  {nextMeta.text && (
                    <div className="text-xs text-gray-300">
                      {(nextMeta.text || '').slice(0, 100)}
                      {(nextMeta.text || '').length > 100 ? '…' : ''}
                    </div>
                  )}
                  <div className="text-[11px] text-gray-500 mt-1">
                    {dtf
                      ? dtf.format(new Date(nextMeta.createdAt))
                      : new Date(nextMeta.createdAt).toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
        {(() => {
          const imgRe = /\.(jpeg|jpg|gif|png|webp)$/i;
          const mediaUrl = post.videoUrl || post.imageUrl || null;
          if (!mediaUrl) return null;
          const looksVideo = !!(post.videoUrl || (post.imageUrl && !imgRe.test(post.imageUrl)));
          return (
            <div className="mb-4 relative">
              {looksVideo ? (
                <video
                  src={mediaUrl}
                  controls
                  playsInline
                  className={`w-full h-auto max-h-[75vh] rounded-lg object-contain ${
                    post.isExclusive && access && access.access === false
                      ? 'blur-sm select-none pointer-events-none'
                      : ''
                  }`}
                />
              ) : (
                <img
                  src={mediaUrl}
                  alt="Contenido del post"
                  className={`w-full h-auto max-h-[75vh] rounded-lg object-contain ${
                    post.isExclusive && access && access.access === false
                      ? 'blur-sm select-none pointer-events-none'
                      : ''
                  }`}
                />
              )}
              {post.isExclusive && access && access.access === false && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="px-3 py-1 rounded bg-black/60 text-white text-sm">
                    {t('lockedContent') || 'Contenido bloqueado'}
                  </span>
                </div>
              )}
            </div>
          );
        })()}

        {post.text && !(post.isExclusive && access && access.access === false) && (
          <p className="text-gray-200 whitespace-pre-wrap">{post.text}</p>
        )}

        <p className="text-sm text-gray-400 mt-2">
          {t('publishedOn') || 'Publicado el'}{' '}
          {dtf
            ? dtf.format(new Date(post.createdAt))
            : new Date(post.createdAt).toLocaleDateString()}
        </p>

        {post.isExclusive && access && access.access === false && (
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => subscribe(post.creator?._id || post.creator)}
              className="px-3 py-2 bg-pink-600 hover:bg-pink-700 rounded"
            >
              {t('subscribe') || 'Suscribirse'}
            </button>
            <button
              onClick={buyPPV}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded"
            >
              {fmtPrice(
                post.ppvAmountCents ||
                  parseInt(process.env.NEXT_PUBLIC_PPV_DEFAULT_CENTS || '500', 10),
                post.ppvCurrency || 'usd'
              )}{' '}
              · {t('buyPpv') || 'Comprar PPV'}
            </button>
            <button
              onClick={async () => {
                const val = prompt(t('tipAmountPrompt') || '');
                if (!val) return;
                const cents = Math.round(parseFloat(String(val).replace(',', '.')) * 100);
                if (!Number.isFinite(cents) || cents <= 0)
                  return alert(t('invalidAmount') || '');
                try {
                  const r = await fetch('/api/stripe/checkout/tip', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      creatorId: post.creator?._id || post.creator,
                      amountCents: cents,
                      currency: post.ppvCurrency || 'usd',
                    }),
                  });
                  const j = await r.json();
                  if (!r.ok || !j.url)
                    throw new Error(j.message || (t('paymentStartError') || ''));
                  window.location.href = j.url;
                } catch (e) {
                  alert(e.message);
                }
              }}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            >
              {t('leaveTip') || 'Dejar propina'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PostDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-gray-300 p-6">
          Cargando publicación…
        </div>
      }
    >
      <PostDetailInner />
    </Suspense>
  );
}
