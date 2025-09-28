"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaPaperPlane } from 'react-icons/fa';
import EditProfileModal from '../../components/EditProfileModal';
import ConfirmDeleteAccountModal from '../../components/ConfirmDeleteAccountModal';
import DatePicker from '../../components/DatePicker';
import { useLanguage } from '@/lib/i18n';

// ⬇️ Rails de sugerencias
import PublicSuggestionsRail from '@/app/components/PublicSuggestionsRail';
import SuggestionsRail from '@/app/components/SuggestionsRail';
import PublicTopbar from '@/app/components/PublicTopbar';

export default function UserProfilePage({ params }) {
  const { data: session, status, update } = useSession();
  const { t, lang } = useLanguage();
  const router = useRouter();
  const { id: profileId } = params;

  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionMode, setSubscriptionMode] = useState(null);
  const [creatorHasPrice, setCreatorHasPrice] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('posts');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [accessMap, setAccessMap] = useState({});
  const [toast, setToast] = useState(null);

  const [editingPostId, setEditingPostId] = useState(null);
  const [editMode, setEditMode] = useState('public');
  const [editPpvPrice, setEditPpvPrice] = useState('');
  const [editPpvCurrency, setEditPpvCurrency] = useState('usd');
  const [editingTextId, setEditingTextId] = useState(null);
  const [editingTextValue, setEditingTextValue] = useState('');

  const [isFavorite, setIsFavorite] = useState(false);
  const [planMenuOpen, setPlanMenuOpen] = useState(false);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [autoRenew, setAutoRenew] = useState(true);
  const [customEndDate, setCustomEndDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [connect, setConnect] = useState({ connected: false, chargesEnabled: false, accountId: null, loading: false, error: null });
  const [subscribeLoading, setSubscribeLoading] = useState(false);
  const [planError, setPlanError] = useState(null);
  const [launchingCheckout, setLaunchingCheckout] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState(null);
  const [checkoutType, setCheckoutType] = useState(null);
  const [showPaymentOverlay, setShowPaymentOverlay] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [avatarError, setAvatarError] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const planMenuRef = useRef(null);
  const checkoutWindowRef = useRef(null);
  const checkoutWatcherRef = useRef(null);

  const dtf = useMemo(() => { try { return new Intl.DateTimeFormat(lang || 'es', { dateStyle: 'medium' }); } catch { return null; } }, [lang]);
  const fmt = (cents, cur='usd') => { const C = (cur||'usd').toUpperCase(); return C === 'CLP' ? `${cents} ${C}` : `$${(cents/100).toFixed(2)} ${C}`; };

  const detectVideoMedia = (post = {}) => {
    if (post.videoUrl) return true;
    const raw = post.imageUrl || '';
    if (!raw) return false;
    try {
      const url = new URL(raw);
      if (/\/video\/upload\//.test(url.pathname)) return true;
      if (/\.(mp4|mov|m4v|webm|avi)$/i.test(url.pathname)) return true;
    } catch {
      if (!/\.(jpeg|jpg|gif|png|webp|avif)$/i.test(raw.split('?')[0])) return true;
    }
    return false;
  };

  const getMediaInfo = (post, hasAccess) => {
    const mediaSrc = post?.videoUrl || post?.imageUrl;
    if (!mediaSrc) return null;
    const isVideo = detectVideoMedia(post);
    return {
      type: isVideo ? 'video' : 'image',
      src: mediaSrc,
      locked: !!post?.isExclusive && !hasAccess,
    };
  };

  const stopCheckoutWatcher = () => {
    if (checkoutWatcherRef.current) {
      try { clearInterval(checkoutWatcherRef.current); } catch {}
    }
    checkoutWatcherRef.current = null;
  };

  const handleCheckoutClosed = async () => {
    stopCheckoutWatcher();
    checkoutWindowRef.current = null;
    setPopupBlocked(false);
    setShowPaymentOverlay(false);
    setCheckoutUrl(null);
    setCheckoutType(null);
    try {
      await fetchProfileData();
    } catch {}
  };

  const startCheckoutWatcher = () => {
    stopCheckoutWatcher();
    if (typeof window === 'undefined') return;
    checkoutWatcherRef.current = window.setInterval(() => {
      const popup = checkoutWindowRef.current;
      if (!popup) {
        stopCheckoutWatcher();
        return;
      }
      try {
        if (popup.closed) {
          handleCheckoutClosed();
        }
      } catch (err) {
        if (err?.name !== 'SecurityError') {
          handleCheckoutClosed();
        }
      }
    }, 1200);
  };

  const launchCheckout = (url) => {
    if (!url || typeof window === 'undefined') return false;
    try {
      const popup = window.open(url, 'lustly-checkout', 'width=480,height=720,noopener');
      if (!popup) {
        return false;
      }
      checkoutWindowRef.current = popup;
      popup.focus?.();
      startCheckoutWatcher();
      return true;
    } catch {
      return false;
    }
  };

  const closePlanMenu = () => {
    setPlanMenuOpen(false);
    setPlanError(null);
    setLaunchingCheckout(false);
    setShowDatePicker(false);
    setPopupBlocked(false);
  };

  const closePaymentOverlay = () => {
    setPopupBlocked(false);
    setShowPaymentOverlay(false);
    setCheckoutUrl(null);
    setCheckoutType(null);
  };

  const isOwner = () => {
    try { return !!(session && session.user?.id && (session.user.id === profileId || session.user.id === user?._id)); }
    catch { return false; }
  };

  const canMessage = !isOwner() && isSubscribed && (!creatorHasPrice || subscriptionMode === 'stripe');

  const redirectToLoginWithCallback = () => {
    const cb = encodeURIComponent(`/profile/${profileId}`);
    router.push(`/auth/login?callbackUrl=${cb}`);
  };

  const refreshIsFavorite = async () => {
    try {
      if (!session) { setIsFavorite(false); return; }
      const r = await fetch('/api/favorites');
      if (!r.ok) { setIsFavorite(false); return; }
      const j = await r.json();
      const ids = new Set((j.favorites || []).map((u) => String(u._id)));
      setIsFavorite(ids.has(String(profileId)));
    } catch { setIsFavorite(false); }
  };

  const toggleFavorite = async () => {
    if (!session) { redirectToLoginWithCallback(); return; }
    try {
      const method = isFavorite ? 'DELETE' : 'POST';
      const r = await fetch(`/api/favorites/${profileId}`, { method });
      if (!r.ok) throw new Error('Error');
      setIsFavorite(!isFavorite);
      setToast({
        type: 'success',
        msg: !isFavorite ? (t('addedToFavorites') || '') : (t('removedFromFavorites') || ''),
      });
    } catch {}
  };

  const handleLike = async (postId) => {
    if (!session) { redirectToLoginWithCallback(); return; }
    try {
      const res = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      });
      if (!res.ok) throw new Error('Like error');
      setPosts((arr)=>arr.map(p=>{
        if (String(p._id)!==String(postId)) return p;
        const liked = (p.likes||[]).some(id => String(id) === String(session.user.id));
        const newLikes = liked
          ? (p.likes||[]).filter(id => String(id) !== String(session.user.id))
          : ([...(p.likes||[]), session.user.id]);
        return { ...p, likes: newLikes };
      }));
    } catch (e) { alert(t('likeErrorTryAgain') || ''); }
  };

  const handleSubscribeStripe = async (event) => {
    event?.preventDefault?.();
    if (!session) { redirectToLoginWithCallback(); return; }
    setPlanError(null);
    setSubscribeLoading(true);
    setPopupBlocked(false);
    try {
      const priceRes = await fetch(`/api/creators/${profileId}/price`);
      const priceData = await priceRes.json().catch(() => ({}));
      if (!priceRes.ok) {
        throw new Error(priceData?.message || (t('plansLoadError') || 'No se pudieron cargar los planes.'));
      }

      const plans = (priceData.plans || []).filter((p) => !!p.priceId);
      if (plans.length > 0) {
        setPopupBlocked(false);
        setAvailablePlans(plans);
        setSelectedPlan(plans[0]);
        setAutoRenew(true);
        setCustomEndDate('');
        setShowDatePicker(false);
        setPlanMenuOpen(true);
        return;
      }

      const seemsMonetized = Boolean(priceData.priceId) || (priceData.plans || []).some((p) => !!p.priceId) || creatorHasPrice;
      if (seemsMonetized) {
        throw new Error(t('subscriptionPlansUnavailable') || 'Este creador tiene monetización activa, pero los planes no están disponibles por el momento.');
      }

      setPopupBlocked(false);
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId: profileId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || (t('subscriptionCreateError') || 'No se pudo suscribir.'));
      }
      setIsSubscribed(true);
      setSubscriptionMode('free');
      setToast({ type: 'success', msg: t('subscribed') || 'Suscrito' });
    } catch (e) {
      setToast({ type: 'error', msg: e?.message || (t('subscriptionCreateError') || 'No se pudo suscribir.') });
    } finally {
      setSubscribeLoading(false);
    }
  };

  const startSubscriptionCheckout = async () => {
    if (!selectedPlan?.priceId) {
      setPlanError(t('selectPlanFirst') || 'Selecciona un plan para continuar.');
      return;
    }

    setPlanError(null);
    setLaunchingCheckout(true);
    setPopupBlocked(false);
    try {
      let cancelAt = null;
      let autoCancelAtPeriodEnd = !autoRenew;
      if (customEndDate) {
        const d = new Date(`${customEndDate}T23:59:59`);
        const ts = Math.floor(d.getTime() / 1000);
        if (Number.isFinite(ts) && ts > Math.floor(Date.now() / 1000)) {
          cancelAt = ts;
          autoCancelAtPeriodEnd = false;
        }
      }

      let priceToUse = selectedPlan.priceId;
      if (customEndDate) {
        const dayPlan = (availablePlans || []).find((p) => p.key === 'day_1' && p.priceId);
        if (dayPlan) {
          priceToUse = dayPlan.priceId;
        } else if (selectedPlan.key !== 'day_1') {
          setPlanError(t('customEndDateRequiresDailyPlan') || 'Para elegir una fecha de término personalizada necesitas tener configurado un plan diario.');
          setLaunchingCheckout(false);
          return;
        }
      }

      const body = {
        creatorId: profileId,
        priceId: priceToUse,
        autoCancelAtPeriodEnd,
        cancelAt,
      };
      if (selectedPlan.couponId) body.coupon = selectedPlan.couponId;

      const res = await fetch('/api/stripe/checkout/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) {
        throw new Error(data?.message || (t('checkoutStartError') || 'No se pudo iniciar el pago.'));
      }

      closePlanMenu();
      setCheckoutUrl(data.url);
      setCheckoutType('subscription');
      setShowPaymentOverlay(true);
      const opened = launchCheckout(data.url);
      if (!opened) {
        setPopupBlocked(true);
      } else {
        setPopupBlocked(false);
      }
    } catch (e) {
      setPlanError(e?.message || (t('checkoutStartError') || 'No se pudo iniciar el pago.'));
    } finally {
      setLaunchingCheckout(false);
    }
  };

  const handleBuyPPV = async (postId) => {
    if (!session) { redirectToLoginWithCallback(); return; }
    try {
      setPopupBlocked(false);
      const res = await fetch('/api/stripe/checkout/ppv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.url) {
        throw new Error(j?.message || (t('paymentStartError') || 'No se pudo iniciar el pago.'));
      }
      setCheckoutUrl(j.url);
      setCheckoutType('ppv');
      setShowPaymentOverlay(true);
      const opened = launchCheckout(j.url);
      if (!opened) {
        setPopupBlocked(true);
      } else {
        setPopupBlocked(false);
      }
    } catch (e) {
      setToast({ type: 'error', msg: e?.message || (t('paymentStartError') || 'No se pudo iniciar el pago.') });
    }
  };

  const checkAccessForPosts = async (postsList) => {
    try {
      const entries = await Promise.all((postsList || []).map(async (p) => {
        try { const r = await fetch(`/api/access/post/${p._id}`); const j = await r.json(); return [p._id, !!j.access]; } catch { return [p._id, false]; }
      }));
      setAccessMap(Object.fromEntries(entries));
    } catch {}
  };

  const fetchProfileData = async () => {
    try {
      let apiEndpoint = `/api/posts/profile/${profileId}`;
      if (activeTab === 'media') apiEndpoint += '?type=media';
      const res = await fetch(apiEndpoint);
      if (!res.ok) throw new Error('User not found');
      const data = await res.json();
      setUser(data.user); setPosts(data.posts);

      try {
        const sp = data.user?.stripePrices || {};
        const hasAny = !!(data.user?.stripePriceId || sp?.day_1 || sp?.week_1 || sp?.month_1 || sp?.month_3 || sp?.month_6 || sp?.year_1);
        setCreatorHasPrice(!!hasAny);
      } catch { setCreatorHasPrice(false); }

      await checkAccessForPosts(data.posts);

      try {
        const anonKey = 'lustly_anon_id'; let anonId = null;
        try { anonId = localStorage.getItem(anonKey); if (!anonId) { anonId = (crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2)}`); localStorage.setItem(anonKey, anonId); } } catch {}
        (data.posts || []).forEach((p) => {
          const payload = JSON.stringify({ postId: p._id, creatorId: p.creator?._id || p.creator, anonymousId: anonId });
          try { if (navigator.sendBeacon) { const blob = new Blob([payload], { type: 'application/json' }); navigator.sendBeacon('/api/analytics/views', blob); } else { fetch('/api/analytics/views', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload }); } } catch {}
        });
      } catch {}

      if (session) {
        const subscriptionRes = await fetch(`/api/subscriptions?creatorId=${profileId}`);
        if (subscriptionRes.ok) {
          const subscriptionData = await subscriptionRes.json();
          setIsSubscribed(!!subscriptionData.isSubscribed);
          setSubscriptionMode(subscriptionData.mode || null);
        }
      }
    } catch (e) { setError(e.message); } finally { setIsLoading(false); }
  };

  const openEditPpv = (post) => {
    setEditingPostId(post._id);
    setEditMode(post.isExclusive ? (post.ppvEnabled ? 'exclusive_ppv' : 'exclusive') : 'public');
    const cents = post.ppvAmountCents || parseInt(process.env.NEXT_PUBLIC_PPV_DEFAULT_CENTS || '500', 10);
    setEditPpvPrice(post.ppvAmountCents ? String((post.ppvCurrency||'usd').toLowerCase()==='clp' ? cents : (cents/100).toFixed(2)) : '');
    setEditPpvCurrency((post.ppvCurrency || 'usd').toLowerCase());
  };

  const saveEditPpv = async () => {
    try {
      const isExclusive = editMode !== 'public';
      const enablePPV = editMode === 'exclusive_ppv';
      let cents = null;
      if (enablePPV) {
        cents = (editPpvCurrency==='clp') ? parseInt(editPpvPrice,10) : Math.round(parseFloat(editPpvPrice||'0')*100);
        if (!Number.isFinite(cents) || cents<=0) { setToast({ type:'error', msg: t('ppvInvalidPrice') || '' }); return; }
      }
      const payload = { isExclusive, ppvEnabled: enablePPV };
      if (enablePPV) { payload.ppvAmountCents = cents; payload.ppvCurrency = editPpvCurrency; }
      const res = await fetch(`/api/posts/${editingPostId}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      const j = await res.json(); if (!res.ok) throw new Error(j.message || 'Error');
      setToast({ type:'success', msg: t('monetizationUpdated') || '' }); setEditingPostId(null); await fetchProfileData();
    } catch (e) { setToast({ type:'error', msg: e.message }); }
  };

  // Stripe Connect (solo dueño)
  useEffect(() => {
    (async () => {
      try {
        if (status !== 'loading' && isOwner()) {
          const cs = await fetch('/api/stripe/connect/status');
          const j = await cs.json();
          if (cs.ok) setConnect((c) => ({ ...c, ...j }));
        }
      } catch {}
    })();
  }, [status, session, profileId]); // eslint-disable-line

  useEffect(() => { if (status !== 'loading') fetchProfileData(); }, [session, profileId, status, activeTab]); // eslint-disable-line

  useEffect(() => { setAvatarError(false); }, [user?.profilePicture]);

  useEffect(() => {
    if (!planMenuOpen) return;
    const onKey = (event) => {
      if (event.key === 'Escape') closePlanMenu();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
    };
  }, [planMenuOpen]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (event) => {
      if (event.key === 'Escape') setLightbox(null);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
    };
  }, [lightbox]);

  useEffect(() => {
    return () => {
      stopCheckoutWatcher();
      try {
        checkoutWindowRef.current?.close?.();
      } catch {}
      checkoutWindowRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const shouldLock = planMenuOpen || showPaymentOverlay || !!lightbox;
    if (!shouldLock || typeof document === 'undefined') return undefined;
    const { body } = document;
    if (!body) return undefined;
    const previousOverflow = body.style.overflow;
    body.style.overflow = 'hidden';
    return () => {
      body.style.overflow = previousOverflow || '';
    };
  }, [planMenuOpen, showPaymentOverlay, lightbox]);
  useEffect(() => { if (status !== 'loading') refreshIsFavorite(); }, [status, session, profileId]); // eslint-disable-line

  if (isLoading || status === 'loading') {
    return <div className="flex min-h-screen items-center justify-center bg-gray-900 text-gray-100 text-2xl">{t('loadingGeneric')}</div>;
  }
  if (error) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-900 text-gray-100 text-2xl">{error}</div>;
  }
  if (!user) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-900 text-gray-100 text-2xl">{t('userNotFound') || 'Usuario no encontrado'}</div>;
  }

  const avatarSrc = !avatarError && user.profilePicture ? user.profilePicture : '/images/placeholder-avatar.png';

  // =========================
  // 👤 INVITADO
  // =========================
  if (!session) {
    const cb = encodeURIComponent(`/profile/${profileId}`);
    return (
      <div className="flex flex-col min-h-screen bg-gray-900 text-gray-100">
        <PublicTopbar />
        {toast && (<div className={`fixed top-4 right-4 px-4 py-2 rounded shadow ${toast.type==='error' ? 'bg-red-600' : 'bg-green-600'}`}>{toast.msg}</div>)}

        <header className="relative w-full h-48 bg-gray-800">
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${user.coverPhoto || '/images/placeholder-cover.jpg'})` }} />
          <div className="absolute -bottom-16 left-8 w-32 h-32 rounded-full border-4 border-gray-900 bg-gray-700 overflow-hidden">
            <img
              src={avatarSrc}
              onError={() => { if (!avatarError) setAvatarError(true); }}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>
        </header>

        <main className="flex-1 p-8 pt-20">
          {/* 2 columnas: contenido + rail público */}
          <div className="max-w-6xl mx-auto lg:flex lg:items-start lg:gap-8">
            {/* columna principal */}
            <div className="flex-1 min-w-0">
              <div className="mb-8">
                <h1 className="text-3xl font-bold">@{user.username}</h1>
                <p className="text-gray-400 mt-1">{user.email}</p>
                <p className="mt-4">{user.bio || t('defaultBio') || ''}</p>
              </div>

              <div className="flex flex-wrap gap-2 mb-8">
                <Link href={`/auth/login?callbackUrl=${cb}`} className="py-2 px-4 rounded-full font-bold transition-colors cursor-pointer bg-pink-600 hover:bg-pink-700">
                  {t('subscribe') || 'Suscribirse'}
                </Link>
                <button onClick={async()=>{ try{ const url = typeof window !== 'undefined' ? window.location.href : ''; if(navigator.share){ await navigator.share({ title: `@${user?.username}`, url }); } else { await navigator.clipboard.writeText(url); setToast({ type: 'success', msg: t('share') || 'Compartido' }); } } catch {} }} className="py-2 px-4 rounded-full font-bold bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-colors cursor-pointer">
                  {t('share') || 'Compartir'}
                </button>
                <Link href={`/auth/login?callbackUrl=${cb}`} className="py-2 px-4 rounded-full font-bold bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-colors cursor-pointer flex items-center gap-2">
                  <FaPaperPlane /><span>{t('message') || 'Mensaje'}</span>
                </Link>
              </div>

              <nav className="border-b border-gray-700 mb-8">
                <ul className="flex space-x-8">
                  <li className="pb-2 border-b-2 border-pink-600">
                    <span className="font-bold text-pink-500">{t('posts') || 'Publicaciones'}</span>
                  </li>
                </ul>
              </nav>

              <div className="space-y-8">
                {(posts || []).length === 0 ? (
                  <div className="text-gray-400">{t('noPostsYet') || 'Este creador aún no tiene publicaciones.'}</div>
                ) : (
                  posts.map((post) => {
                    const isExclusive = !!post.isExclusive;
                    const hasAccess = !isExclusive;
                    const mediaInfo = getMediaInfo(post, hasAccess);
                    const publishedAt = dtf ? dtf.format(new Date(post.createdAt)) : new Date(post.createdAt).toLocaleDateString();
                    const mediaAlt = post.text ? `${post.text}`.slice(0, 80) : 'media';

                    return (
                      <article key={post._id} className="bg-gray-800/90 border border-gray-700/60 p-5 sm:p-6 rounded-2xl shadow-lg">
                        {post.text && (
                          <p className="text-gray-200 mb-4 leading-relaxed whitespace-pre-wrap">{post.text}</p>
                        )}

                        {mediaInfo && (
                          <div className="mt-4">
                            <div className="relative rounded-xl overflow-hidden bg-black/30 flex justify-center">
                              {mediaInfo.type === 'video' ? (
                                <video
                                  src={mediaInfo.src}
                                  controls={!mediaInfo.locked}
                                  playsInline
                                  preload="metadata"
                                  className={`w-full max-h-[420px] object-contain ${mediaInfo.locked ? 'blur-sm pointer-events-none select-none' : ''}`}
                                />
                              ) : (
                                <img
                                  src={mediaInfo.src}
                                  alt={mediaAlt || 'media'}
                                  loading="lazy"
                                  decoding="async"
                                  className={`w-full max-h-[420px] object-contain transition-transform duration-200 ${
                                    mediaInfo.locked
                                      ? 'blur-sm pointer-events-none select-none'
                                      : 'cursor-zoom-in hover:scale-[1.01]'
                                  }`}
                                  onClick={() => { if (!mediaInfo.locked) setLightbox({ type: 'image', src: mediaInfo.src, alt: mediaAlt || 'media' }); }}
                                />
                              )}
                              {!mediaInfo.locked && (
                                <button
                                  type="button"
                                  onClick={() => setLightbox({ type: mediaInfo.type, src: mediaInfo.src, alt: mediaAlt || 'media' })}
                                  className="absolute bottom-3 right-3 px-3 py-1.5 text-xs font-semibold bg-black/70 text-white rounded-full hover:bg-black/80 transition-colors"
                                >
                                  {t('viewFull') || 'Ver completo'}
                                </button>
                              )}
                              {mediaInfo.locked && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                  <span className="px-3 py-1 rounded bg-black/70 text-white text-sm">{t('lockedContent') || 'Contenido bloqueado'}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="mt-4 text-xs text-gray-400">
                          {(t('publishedOn') || 'Publicado el')} {publishedAt}
                        </div>

                        {isExclusive && (
                          <div className="mt-4">
                            <Link
                              href={`/auth/login?callbackUrl=${cb}`}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-pink-600 hover:bg-pink-700 font-semibold transition-colors"
                            >
                              {t('subscribe') || 'Suscribirse'}
                            </Link>
                          </div>
                        )}
                      </article>
                    );
                  })
                )}
              </div>
            </div>

            {/* rail público */}
            <PublicSuggestionsRail limit={8} />
          </div>
        </main>
      </div>
    );
  }

  // =========================
  // 👤 USUARIO CON SESIÓN
  // =========================
  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-gray-100">
      {toast && (<div className={`fixed top-4 right-4 px-4 py-2 rounded shadow ${toast.type==='error' ? 'bg-red-600' : 'bg-green-600'}`}>{toast.msg}</div>)}

      <header className="relative w-full h-48 bg-gray-800">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${user.coverPhoto || '/images/placeholder-cover.jpg'})` }} />
        <div className="absolute -bottom-16 left-8 w-32 h-32 rounded-full border-4 border-gray-900 bg-gray-700 overflow-hidden">
          <img
            src={avatarSrc}
            onError={() => { if (!avatarError) setAvatarError(true); }}
            alt="Profile"
            className="w-full h-full object-cover"
          />
        </div>
      </header>

      <main className="flex-1 p-8 pt-20">
        {/* 2 columnas: contenido + rail autenticado */}
        <div className="max-w-6xl mx-auto lg:flex lg:items-start lg:gap-8">
          {/* columna principal */}
          <div className="flex-1 min-w-0">
            <div className="mb-8">
              <h1 className="text-3xl font-bold">@{user.username}</h1>
              <p className="text-gray-400 mt-1">{user.email}</p>
              <p className="mt-4">{user.bio || t('defaultBio') || ''}</p>
            </div>

            <div className="flex flex-wrap gap-2 mb-8">
              {!isOwner() ? (
                <>
                  {!isSubscribed ? (
                    <button
                      onClick={handleSubscribeStripe}
                      disabled={subscribeLoading}
                      className="py-2 px-4 rounded-full font-bold transition-colors cursor-pointer bg-pink-600 hover:bg-pink-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {subscribeLoading ? (t('processingPayment') || 'Procesando...') : (t('subscribe') || 'Suscribirse')}
                    </button>
                  ) : creatorHasPrice ? (
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/stripe/subscription/cancel', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ creatorId: profileId }),
                          });
                          const j = await res.json();
                          if (!res.ok) throw new Error(j.message || 'Error');
                          setIsSubscribed(false);
                          setSubscriptionMode(null);
                          setToast({ type: 'success', msg: t('subscriptionCancelled') || '' });
                        } catch (e) {
                          setToast({ type: 'error', msg: e.message });
                        }
                      }}
                      className="py-2 px-4 rounded-full font-bold bg-gray-700 hover:bg-gray-600 transition-colors cursor-pointer"
                    >
                      {t('cancelSubscription')}
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        try {
                          const r = await fetch('/api/subscriptions', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ creatorId: profileId }),
                          });
                          if (!r.ok) throw new Error('Error');
                          setIsSubscribed(false);
                          setSubscriptionMode(null);
                        } catch (e) {
                          setToast({ type: 'error', msg: e.message });
                        }
                      }}
                      className="py-2 px-4 rounded-full font-bold bg-gray-700 hover:bg-gray-600 transition-colors cursor-pointer"
                    >
                      {t('cancelSubscription')}
                    </button>
                  )}
                  {canMessage && (
                    <button
                      onClick={() => router.push(`/messages?userId=${profileId}`)}
                      className="py-2 px-4 rounded-full font-bold bg-gray-700 hover:bg-gray-600 transition-colors cursor-pointer flex items-center gap-2"
                    >
                      <FaPaperPlane /> <span>{t('message')}</span>
                    </button>
                  )}
                  {!canMessage && creatorHasPrice && isSubscribed && (
                    <div className="px-3 py-2 text-xs text-gray-200 bg-gray-800 border border-gray-700 rounded-full flex items-center gap-2">
                      <FaPaperPlane className="text-gray-400" />
                      <span>{t('messagingOnlyPaid') || 'Los mensajes se activan con una suscripción pagada.'}</span>
                    </div>
                  )}
                  <button
                    onClick={toggleFavorite}
                    className={`py-2 px-4 rounded-full font-bold border transition-colors cursor-pointer ${
                      isFavorite
                        ? 'bg-gray-800 border-gray-700 text-pink-400 hover:bg-gray-700'
                        : 'bg-gray-900 border-gray-700 text-gray-200 hover:bg-gray-800'
                    }`}
                  >
                    {isFavorite ? (t('removeFromFavorites') || 'Quitar de favoritos') : (t('addToFavorites') || 'Agregar a favoritos')}
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setIsModalOpen(true)} className="py-2 px-4 rounded-full font-bold bg-pink-600 hover:bg-pink-700 transition-colors">{t('editProfile')}</button>
                  <button onClick={async()=>{ try{ const url = typeof window !== 'undefined' ? window.location.href : ''; if(navigator.share){ await navigator.share({ title: `@${user?.username}`, url }); } else { await navigator.clipboard.writeText(url); setToast({ type: 'success', msg: t('share') || 'Compartido' }); } } catch {} }} className="py-2 px-4 rounded-full font-bold bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-colors cursor-pointer">
                    {t('share') || 'Compartir'}
                  </button>
                  <button onClick={()=>setDeleteOpen(true)} className="py-2 px-4 rounded-full font-bold bg-red-600 hover:bg-red-700 transition-colors cursor-pointer">
                    {t('deleteAccount') || 'Eliminar cuenta'}
                  </button>
                </>
              )}
            </div>

            <nav className="border-b border-gray-700 mb-8">
              <ul className="flex space-x-8">
                <li className="pb-2 border-b-2 border-pink-600"><span className="font-bold text-pink-500">{t('posts')}</span></li>
              </ul>
            </nav>

            <div className="space-y-8">
              {(posts || []).map((post) => {
                const hasAccess = !!accessMap[post._id] || !post.isExclusive;
                const mediaInfo = getMediaInfo(post, hasAccess);
                const showEdit = isOwner();
                const publishedAt = dtf ? dtf.format(new Date(post.createdAt)) : new Date(post.createdAt).toLocaleDateString();
                const mediaAlt = post.text ? `${post.text}`.slice(0, 80) : 'media';

                return (
                  <article key={post._id} className="bg-gray-800/90 border border-gray-700/60 p-5 sm:p-6 rounded-2xl shadow-lg">
                    {showEdit && editingTextId === post._id ? (
                      <div className="mb-4">
                        <textarea value={editingTextValue} onChange={(e) => setEditingTextValue(e.target.value)} className="w-full p-2 bg-gray-700 rounded border border-gray-600" rows={3} />
                        <div className="mt-2 flex gap-2">
                          <button onClick={async () => { try { const res = await fetch(`/api/posts/${post._id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: editingTextValue }) }); const j = await res.json(); if (!res.ok) throw new Error(j.message || 'Error'); setEditingTextId(null); await fetchProfileData(); setToast({ type: 'success', msg: t('postUpdated') || '' }); } catch (e) { setToast({ type: 'error', msg: e.message }); } }} className="px-3 py-1 rounded bg-green-600 hover:bg-green-700 text-sm cursor-pointer">{t('save')}</button>
                          <button onClick={() => setEditingTextId(null)} className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-sm cursor-pointer">{t('cancel')}</button>
                        </div>
                      </div>
                    ) : (
                      showEdit ? (
                        <div className="mb-4 flex flex-wrap gap-2 items-center">
                          <button onClick={() => { setEditingTextId(post._id); setEditingTextValue(post.text || ''); }} className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-sm cursor-pointer">{t('edit') || 'Editar'}</button>
                          <label className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-sm cursor-pointer">
                            {t('changeMedia') || 'Cambiar imagen/video'}
                            <input type="file" accept="image/*,video/*" className="hidden" onChange={async (e) => {
                              const file = e.target.files?.[0]; if (!file) return;
                              const fd = new FormData(); fd.append('media', file);
                              try {
                                const res = await fetch(`/api/posts/${post._id}`, { method: 'PATCH', body: fd });
                                const j = await res.json();
                                if (!res.ok) throw new Error(j.message || 'Error');
                                await fetchProfileData();
                                setToast({ type: 'success', msg: t('mediaUpdated') || '' });
                              } catch (err) {
                                setToast({ type: 'error', msg: err.message });
                              }
                            }} />
                          </label>
                          {(post.imageUrl || post.videoUrl) && (
                            <button onClick={async () => { if (!confirm(t('confirmRemoveMedia') || '')) return; try { const res = await fetch(`/api/posts/${post._id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ removeMedia: true }) }); const j = await res.json(); if (!res.ok) throw new Error(j.message || 'Error'); await fetchProfileData(); setToast({ type: 'success', msg: t('mediaRemoved') || '' }); } catch (e) { setToast({ type: 'error', msg: e.message }); } }} className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-sm cursor-pointer">{t('removeMedia') || 'Quitar media'}</button>
                          )}
                          <button onClick={async () => { if (!confirm(t('confirmDeletePost') || '')) return; try { const res = await fetch(`/api/posts/${post._id}`, { method: 'DELETE' }); const j = await res.json().catch(() => null); if (!res.ok) throw new Error((j && j.message) || 'Error'); await fetchProfileData(); setToast({ type: 'success', msg: t('postDeleted') || '' }); } catch (e) { setToast({ type: 'error', msg: e.message }); } }} className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-sm cursor-pointer">{t('delete') || 'Eliminar'}</button>
                        </div>
                      ) : null
                    )}

                    {post.text && (hasAccess || !post.isExclusive) && (
                      <p className="text-gray-200 mb-4 leading-relaxed whitespace-pre-wrap">{post.text}</p>
                    )}

                    {mediaInfo && (
                      <div className="mt-4">
                        <div className="relative rounded-xl overflow-hidden bg-black/30 flex justify-center">
                          {mediaInfo.type === 'video' ? (
                            <video
                              src={mediaInfo.src}
                              controls={!mediaInfo.locked}
                              playsInline
                              preload="metadata"
                              className={`w-full max-h-[420px] object-contain ${mediaInfo.locked ? 'blur-sm pointer-events-none select-none' : ''}`}
                            />
                          ) : (
                            <img
                              src={mediaInfo.src}
                              alt={mediaAlt || 'media'}
                              loading="lazy"
                              decoding="async"
                              className={`w-full max-h-[420px] object-contain transition-transform duration-200 ${
                                mediaInfo.locked
                                  ? 'blur-sm pointer-events-none select-none'
                                  : 'cursor-zoom-in hover:scale-[1.01]'
                              }`}
                              onClick={() => { if (!mediaInfo.locked) setLightbox({ type: 'image', src: mediaInfo.src, alt: mediaAlt || 'media' }); }}
                            />
                          )}
                          {!mediaInfo.locked && (
                            <button
                              type="button"
                              onClick={() => setLightbox({ type: mediaInfo.type, src: mediaInfo.src, alt: mediaAlt || 'media' })}
                              className="absolute bottom-3 right-3 px-3 py-1.5 text-xs font-semibold bg-black/70 text-white rounded-full hover:bg-black/80 transition-colors"
                            >
                              {t('viewFull') || 'Ver completo'}
                            </button>
                          )}
                          {mediaInfo.locked && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                              <span className="px-3 py-1 rounded bg-black/70 text-white text-sm">{t('lockedContent') || 'Contenido bloqueado'}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 text-xs text-gray-400">
                      {(t('publishedOn') || 'Publicado el')} {publishedAt}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-4">
                      <button type="button" onClick={() => handleLike(post._id)} className="flex items-center text-gray-400 hover:text-pink-500 transition-colors cursor-pointer" aria-label={t('like') || 'Me gusta'}>
                        <svg className={`w-6 h-6 mr-1 ${session && (post.likes || []).some((id) => String(id) === String(session.user.id)) ? 'text-pink-500' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
                        <span className="font-bold">{(post.likes || []).length}</span>
                      </button>
                    </div>

                    {isOwner() && (
                      editingPostId === post._id ? (
                        <div className="mt-4 border border-gray-700 rounded p-3 space-y-2">
                          <label className="block text-xs text-gray-400 mb-1">{t('monetizationLabel') || 'Monetización'}</label>
                          <select value={editMode} onChange={(e) => setEditMode(e.target.value)} className="w-full p-2 bg-gray-700 rounded border border-gray-600">
                            <option value="public">{t('modePublic') || 'Público'}</option>
                            <option value="exclusive">{t('modeExclusive') || 'Exclusivo (suscriptores)'}</option>
                            <option value="exclusive_ppv">{t('modeExclusivePpv') || 'Exclusivo (suscriptores o PPV)'}</option>
                          </select>
                          {editMode === 'exclusive_ppv' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs text-gray-400 mb-1">{t('ppvPrice') || 'Precio PPV'}</label>
                                <input type="number" step="0.01" min="0.5" value={editPpvPrice} onChange={(e) => setEditPpvPrice(e.target.value)} className="w-full p-2 bg-gray-700 rounded border border-gray-600" />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-400 mb-1">{t('ppvCurrency') || 'Moneda'}</label>
                                <select value={editPpvCurrency} onChange={(e) => setEditPpvCurrency(e.target.value)} className="w-full p-2 bg-gray-700 rounded border border-gray-600">
                                  <option value="usd">USD</option>
                                  <option value="eur">EUR</option>
                                  <option value="clp">CLP</option>
                                </select>
                              </div>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <button onClick={saveEditPpv} className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded">{t('save')}</button>
                            <button onClick={() => setEditingPostId(null)} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded">{t('cancel')}</button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button onClick={() => openEditPpv(post)} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm">{t('editMonetization') || 'Editar monetización'}</button>
                        </div>
                      )
                    )}

                    {!isOwner() && post.isExclusive && !hasAccess && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button onClick={handleSubscribeStripe} className="px-3 py-2 bg-pink-600 hover:bg-pink-700 rounded">{t('subscribe')}</button>
                        {post.ppvEnabled && (
                          <button onClick={() => handleBuyPPV(post._id)} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded">
                            {fmt(post.ppvAmountCents || parseInt(process.env.NEXT_PUBLIC_PPV_DEFAULT_CENTS || '500', 10), post.ppvCurrency || 'usd')} · {t('buyPpv')}
                          </button>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>

          {/* rail autenticado */}
      <SuggestionsRail />
    </div>
  </main>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="relative w-full max-w-5xl"
          >
            <button
              type="button"
              onClick={() => setLightbox(null)}
              className="absolute -top-10 right-0 text-sm text-gray-200 hover:text-white"
            >
              {t('close') || 'Cerrar'}
            </button>
            {lightbox.type === 'video' ? (
              <video
                src={lightbox.src}
                controls
                autoPlay
                playsInline
                preload="metadata"
                className="w-full max-h-[90vh] object-contain rounded-2xl"
              />
            ) : (
              <img
                src={lightbox.src}
                alt={lightbox.alt || 'media'}
                className="w-full max-h-[90vh] object-contain rounded-2xl"
              />
            )}
          </div>
        </div>
      )}

      {planMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={closePlanMenu}
        >
          <div
            ref={planMenuRef}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-6 space-y-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-100">{t('choosePlan') || 'Elige tu plan'}</h3>
                <p className="text-sm text-gray-400 mt-1">{t('choosePlanHelper') || 'Selecciona una opción para continuar con el checkout.'}</p>
              </div>
              <button
                type="button"
                onClick={closePlanMenu}
                className="text-gray-400 hover:text-gray-200 transition-colors"
                aria-label={t('close') || 'Cerrar'}
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {(availablePlans || []).map((plan) => {
                const isActive = selectedPlan?.priceId === plan.priceId;
                const amountLabel = typeof plan.amount === 'number' ? fmt(plan.amount, plan.currency || 'usd') : (t('priceNotAvailable') || 'Precio pendiente');
                const introLabel = plan.introPercent ? `-${plan.introPercent}% ${t('introDiscountOnce') || '1ª compra'}` : null;
                return (
                  <button
                    key={plan.priceId}
                    type="button"
                    onClick={() => setSelectedPlan(plan)}
                    className={`w-full text-left rounded-2xl border p-4 transition-colors ${
                      isActive
                        ? 'border-pink-500 bg-pink-500/10 shadow-lg'
                        : 'border-gray-700 bg-gray-800/60 hover:border-pink-500/40 hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-semibold text-gray-100">{plan.label}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {plan.intervalCount && plan.interval ? `${plan.intervalCount} ${plan.interval}` : ''}
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-gray-100">{amountLabel}</div>
                    </div>
                    {introLabel && <div className="text-xs text-pink-300 mt-2">{introLabel}</div>}
                  </button>
                );
              })}
              {(availablePlans || []).length === 0 && (
                <div className="text-sm text-gray-400 border border-gray-700 rounded-xl p-4 bg-gray-800/60">
                  {t('noPlansFound') || 'No encontramos planes disponibles por ahora.'}
                </div>
              )}
            </div>

            <div className="space-y-3 text-sm text-gray-200">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={autoRenew}
                  onChange={(event) => setAutoRenew(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-pink-500 focus:ring-pink-500"
                />
                <span>{t('autoRenewLabel') || 'Renovar automáticamente al terminar el periodo.'}</span>
              </label>

              <div>
                <button
                  type="button"
                  onClick={() => setShowDatePicker((prev) => !prev)}
                  className="px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 hover:border-pink-500/60 text-sm"
                >
                  {customEndDate ? `${t('customEndDateSelected') || 'Finaliza el'} ${customEndDate}` : (t('customEndDate') || 'Elegir fecha de finalización')}
                </button>
                {showDatePicker && (
                  <div className="mt-2 space-y-2">
                    <DatePicker value={customEndDate} minDate={new Date()} onChange={(value) => setCustomEndDate(value)} />
                    <button type="button" onClick={() => { setCustomEndDate(''); setShowDatePicker(false); }} className="text-xs text-gray-400 hover:text-gray-200">
                      {t('clear') || 'Limpiar selección'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {planError && (
              <div className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg p-3">
                {planError}
              </div>
            )}

            <button
              type="button"
              onClick={startSubscriptionCheckout}
              disabled={launchingCheckout || !selectedPlan?.priceId}
              className="w-full py-3 rounded-xl font-semibold bg-pink-600 hover:bg-pink-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {launchingCheckout ? (t('openingCheckout') || 'Abriendo checkout...') : (t('continueToCheckout') || 'Continuar al pago')}
            </button>
          </div>
        </div>
      )}

      {showPaymentOverlay && checkoutUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={closePaymentOverlay}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-6 space-y-4 text-gray-200"
          >
            <h3 className="text-lg font-semibold">
              {checkoutType === 'ppv' ? (t('ppvCheckoutTitle') || 'Completa tu compra PPV') : (t('subscriptionCheckoutTitle') || 'Completa tu suscripción')}
            </h3>
            <p className="text-sm text-gray-300">
              {t('checkoutPopupHint') || 'Abrimos una ventana con el checkout seguro de Stripe. Si no la ves, habilita las ventanas emergentes y vuelve a intentarlo.'}
            </p>
            {popupBlocked && (
              <div className="rounded-lg border border-yellow-600/60 bg-yellow-900/20 px-3 py-2 text-xs text-yellow-200">
                {t('popupBlockedWarning') || 'Tu navegador bloqueó la ventana emergente. Habilita los pop-ups para continuar o abre el enlace manualmente.'}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => {
                  const opened = launchCheckout(checkoutUrl);
                  if (!opened) setPopupBlocked(true);
                  else setPopupBlocked(false);
                }}
                className="flex-1 py-2 rounded-lg bg-pink-600 hover:bg-pink-700 font-semibold"
              >
                {t('openCheckoutCta') || 'Abrir checkout'}
              </button>
              <button
                type="button"
                onClick={closePaymentOverlay}
                className="flex-1 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 font-semibold"
              >
                {t('close') || 'Cerrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <EditProfileModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} user={user} onSave={async()=>{ await fetchProfileData(); try{ await update(); } catch{} }} />
      <ConfirmDeleteAccountModal open={deleteOpen} onClose={()=>setDeleteOpen(false)} onDeleted={async()=>{ await signOut({ callbackUrl: '/auth/login' }); }} />
    </div>
  );
}
