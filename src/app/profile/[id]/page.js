"use client";

import { useEffect, useMemo, useState } from 'react';
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

  const dtf = useMemo(() => { try { return new Intl.DateTimeFormat(lang || 'es', { dateStyle: 'medium' }); } catch { return null; } }, [lang]);
  const fmt = (cents, cur='usd') => { const C = (cur||'usd').toUpperCase(); return C === 'CLP' ? `${cents} ${C}` : `$${(cents/100).toFixed(2)} ${C}`; };

  const isOwner = () => {
    try { return !!(session && session.user?.id && (session.user.id === profileId || session.user.id === user?._id)); }
    catch { return false; }
  };

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
      if (!isFavorite) setToast({ type: 'success', msg: t('addedToFavorites') || '' });
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

  const handleSubscribeStripe = async () => {
    if (!session) { redirectToLoginWithCallback(); return; }
    try {
      const priceRes = await fetch(`/api/creators/${profileId}/price`);
      const priceData = await priceRes.json();
      if (!priceRes.ok) throw new Error(priceData.message || '');
      const plans = (priceData.plans || []).filter(p => !!p.priceId);
      if (!plans.length) {
        const r = await fetch('/api/subscriptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ creatorId: profileId }) });
        if (!r.ok) throw new Error('No se pudo suscribir');
        setIsSubscribed(true);
        setToast({ type: 'success', msg: t('subscribed') || 'Suscrito' });
        return;
      }
      setAvailablePlans(plans);
      setSelectedPlan(plans[0]);
      setPlanMenuOpen(true);
    } catch (e) { alert(e.message); }
  };

  const startSubscriptionCheckout = async () => {
    try {
      if (!selectedPlan?.priceId) throw new Error('Plan inválido');
      let cancelAt = null;
      let autoCancelAtPeriodEnd = !autoRenew;
      if (customEndDate) {
        const d = new Date(customEndDate + 'T23:59:59');
        const ts = Math.floor(d.getTime() / 1000);
        if (Number.isFinite(ts) && ts > Math.floor(Date.now()/1000)) { cancelAt = ts; autoCancelAtPeriodEnd = false; }
      }
      let priceToUse = selectedPlan.priceId;
      if (customEndDate) {
        const dayPlan = (availablePlans||[]).find(p => p.key === 'day_1' && p.priceId);
        if (dayPlan) priceToUse = dayPlan.priceId;
      }
      const body = { creatorId: profileId, priceId: priceToUse, autoCancelAtPeriodEnd, cancelAt };
      if (selectedPlan.couponId) body.coupon = selectedPlan.couponId;
      const res = await fetch('/api/stripe/checkout/subscription', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.message || (t('checkoutStartError') || ''));
      window.location.href = data.url;
    } catch (e) { alert(e.message); }
  };

  const handleBuyPPV = async (postId) => {
    if (!session) { redirectToLoginWithCallback(); return; }
    try {
      const res = await fetch('/api/stripe/checkout/ppv', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ postId }) });
      const j = await res.json();
      if (!res.ok || !j.url) throw new Error(j.message || (t('paymentStartError') || ''));
      window.location.href = j.url;
    } catch (e) { alert(e.message); }
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
            <img src={user.profilePicture || '/images/placeholder-avatar.png'} alt="Profile" className="w-full h-full object-cover" />
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
                    const mediaUrl = post.videoUrl || post.imageUrl || null;
                    const isVideo = !!post.videoUrl || (post.imageUrl && !/\.(jpeg|jpg|gif|png|webp)$/i.test(post.imageUrl||''));
                    return (
                      <div key={post._id} className="bg-gray-800 p-6 rounded-lg shadow-lg">
                        {mediaUrl && (
                          <div className="mb-3 relative">
                            {isVideo ? (
                              <video
                                src={mediaUrl}
                                className={`w-full h-auto max-h-[75vh] rounded object-contain ${isExclusive ? 'blur-sm select-none pointer-events-none' : ''}`}
                                controls={!isExclusive}
                                playsInline
                              />
                            ) : (
                              <img
                                src={mediaUrl}
                                alt="media"
                                className={`w-full h-auto max-h-[75vh] rounded object-contain ${isExclusive ? 'blur-sm select-none pointer-events-none' : ''}`}
                              />
                            )}
                            {isExclusive && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="px-3 py-1 rounded bg-black/60 text-white text-sm">
                                  {t('lockedContent') || 'Contenido bloqueado'}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {post.text && !isExclusive && (
                          <p className="text-gray-200 whitespace-pre-wrap mb-3">{post.text}</p>
                        )}

                        <div className="text-xs text-gray-400 mb-3">
                          {t('publishedOn') || 'Publicado el'} {dtf ? dtf.format(new Date(post.createdAt)) : new Date(post.createdAt).toLocaleDateString()}
                        </div>

                        {isExclusive && (
                          <div className="mt-2">
                            <Link href={`/auth/login?callbackUrl=${cb}`} className="px-3 py-2 rounded bg-pink-600 hover:bg-pink-700">
                              {t('subscribe') || 'Suscribirse'}
                            </Link>
                          </div>
                        )}
                      </div>
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
          <img src={user.profilePicture || '/images/placeholder-avatar.png'} alt="Profile" className="w-full h-full object-cover" />
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
                    <button onClick={handleSubscribeStripe} className="py-2 px-4 rounded-full font-bold transition-colors cursor-pointer bg-pink-600 hover:bg-pink-700">
                      {t('subscribe')}
                    </button>
                  ) : creatorHasPrice ? (
                    <button
                      onClick={async()=>{ try{ const res = await fetch('/api/stripe/subscription/cancel', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ creatorId: profileId })}); const j = await res.json(); if(!res.ok) throw new Error(j.message||'Error'); setIsSubscribed(false); setToast({type:'success', msg:t('subscriptionCancelled')||''}); }catch(e){ setToast({type:'error', msg:e.message}); } }}
                      className="py-2 px-4 rounded-full font-bold bg-gray-700 hover:bg-gray-600 transition-colors cursor-pointer"
                    >
                      {t('cancelSubscription')}
                    </button>
                  ) : (
                    <button
                      onClick={async()=>{ try{ const r = await fetch('/api/subscriptions', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ creatorId: profileId }) }); if (!r.ok) throw new Error('Error'); setIsSubscribed(false); } catch(e){ setToast({type:'error', msg: e.message}); } }}
                      className="py-2 px-4 rounded-full font-bold bg-gray-700 hover:bg-gray-600 transition-colors cursor-pointer"
                    >
                      {t('cancelSubscription')}
                    </button>
                  )}
                  <button
                    onClick={()=> router.push(`/messages?userId=${profileId}`)}
                    className="py-2 px-4 rounded-full font-bold bg-gray-700 hover:bg-gray-600 transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <FaPaperPlane /> <span>{t('message')}</span>
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
                const mediaUrl = post.videoUrl || post.imageUrl || null;
                const isVideo = !!post.videoUrl || (post.imageUrl && !/\.(jpeg|jpg|gif|png|webp)$/i.test(post.imageUrl||''));
                const showEdit = isOwner();

                return (
                  <div key={post._id} className="bg-gray-800 p-6 rounded-lg shadow-lg">
                    {/* Controles de edición sólo dueño */}
                    {showEdit && editingTextId === post._id ? (
                      <div className="mb-3">
                        <textarea value={editingTextValue} onChange={e=>setEditingTextValue(e.target.value)} className="w-full p-2 bg-gray-700 rounded border border-gray-600" rows={3} />
                        <div className="mt-2 flex gap-2">
                          <button onClick={async()=>{ try{ const res = await fetch(`/api/posts/${post._id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text: editingTextValue })}); const j = await res.json(); if(!res.ok) throw new Error(j.message||'Error'); setEditingTextId(null); await fetchProfileData(); setToast({type:'success', msg: t('postUpdated') || ''}); }catch(e){ setToast({type:'error', msg:e.message}); } }} className="px-3 py-1 rounded bg-green-600 hover:bg-green-700 text-sm cursor-pointer">{t('save')}</button>
                          <button onClick={()=>setEditingTextId(null)} className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-sm cursor-pointer">{t('cancel')}</button>
                        </div>
                      </div>
                    ) : (
                      showEdit ? (
                        <div className="mb-3 flex flex-wrap gap-2 items-center">
                          <button onClick={()=>{ setEditingTextId(post._id); setEditingTextValue(post.text||''); }} className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-sm cursor-pointer">{t('edit') || 'Editar'}</button>
                          <label className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-sm cursor-pointer">
                            {t('changeMedia') || 'Cambiar imagen/video'}
                            <input type="file" accept="image/*,video/*" className="hidden" onChange={async (e)=>{
                              const file = e.target.files?.[0]; if(!file) return;
                              const fd = new FormData(); fd.append('media', file);
                              try{ const res = await fetch(`/api/posts/${post._id}`, { method:'PATCH', body: fd }); const j = await res.json(); if(!res.ok) throw new Error(j.message||'Error'); await fetchProfileData(); setToast({type:'success', msg: t('mediaUpdated') || ''}); }catch(err){ setToast({type:'error', msg: err.message}); }
                            }} />
                          </label>
                          {(post.imageUrl || post.videoUrl) && (
                            <button onClick={async()=>{ if(!confirm(t('confirmRemoveMedia') || '')) return; try{ const res = await fetch(`/api/posts/${post._id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ removeMedia: true })}); const j = await res.json(); if(!res.ok) throw new Error(j.message||'Error'); await fetchProfileData(); setToast({type:'success', msg: t('mediaRemoved') || ''}); }catch(e){ setToast({type:'error', msg:e.message}); } }} className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-sm cursor-pointer">{t('removeMedia') || 'Quitar media'}</button>
                          )}
                          <button onClick={async()=>{ if(!confirm(t('confirmDeletePost') || '')) return; try{ const res = await fetch(`/api/posts/${post._id}`, { method:'DELETE' }); const j = await res.json().catch(()=>null); if(!res.ok) throw new Error((j&&j.message)||'Error'); await fetchProfileData(); setToast({type:'success', msg: t('postDeleted') || ''}); }catch(e){ setToast({type:'error', msg:e.message}); } }} className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-sm cursor-pointer">{t('delete') || 'Eliminar'}</button>
                        </div>
                      ) : null
                    )}

                    {mediaUrl && (
                      <div className="mb-3 relative">
                        {isVideo ? (
                          <video src={mediaUrl} controls playsInline className={`w-full h-auto max-h-[75vh] rounded object-contain ${!hasAccess && post.isExclusive ? 'blur-sm select-none pointer-events-none' : ''}`} />
                        ) : (
                          <img src={mediaUrl} alt="media" className={`w-full h-auto max-h-[75vh] rounded object-contain ${!hasAccess && post.isExclusive ? 'blur-sm select-none pointer-events-none' : ''}`} />
                        )}
                        {!hasAccess && post.isExclusive && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="px-3 py-1 rounded bg-black/60 text-white text-sm">{t('lockedContent') || 'Contenido bloqueado'}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {post.text && (hasAccess || !post.isExclusive) && (
                      <p className="text-gray-200 whitespace-pre-wrap mb-3">{post.text}</p>
                    )}

                    <div className="text-xs text-gray-400 mb-3">
                      {t('publishedOn') || 'Publicado el'} {dtf ? dtf.format(new Date(post.createdAt)) : new Date(post.createdAt).toLocaleDateString()}
                    </div>

                    {/* Acción: Me gusta */}
                    <div className="flex items-center gap-4 mb-2">
                      <button type="button" onClick={() => handleLike(post._id)} className="flex items-center text-gray-400 hover:text-pink-500 transition-colors cursor-pointer" aria-label={t('like') || 'Me gusta'}>
                        <svg className={`w-6 h-6 mr-1 ${session && (post.likes || []).some(id => String(id) === String(session.user.id)) ? 'text-pink-500' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
                        <span className="font-bold">{(post.likes || []).length}</span>
                      </button>
                    </div>

                    {/* Monetización solo dueño */}
                    {isOwner() && (
                      editingPostId === post._id ? (
                        <div className="border border-gray-700 rounded p-3 space-y-2">
                          <label className="block text-xs text-gray-400 mb-1">{t('monetizationLabel') || 'Monetización'}</label>
                          <select value={editMode} onChange={e=>setEditMode(e.target.value)} className="w-full p-2 bg-gray-700 rounded border border-gray-600">
                            <option value="public">{t('modePublic') || 'Público'}</option>
                            <option value="exclusive">{t('modeExclusive') || 'Exclusivo (suscriptores)'}</option>
                            <option value="exclusive_ppv">{t('modeExclusivePpv') || 'Exclusivo (suscriptores o PPV)'}</option>
                          </select>
                          {editMode === 'exclusive_ppv' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs text-gray-400 mb-1">{t('ppvPrice') || 'Precio PPV'}</label>
                                <input type="number" step="0.01" min="0.5" value={editPpvPrice} onChange={e=>setEditPpvPrice(e.target.value)} className="w-full p-2 bg-gray-700 rounded border border-gray-600" />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-400 mb-1">{t('ppvCurrency') || 'Moneda'}</label>
                                <select value={editPpvCurrency} onChange={e=>setEditPpvCurrency(e.target.value)} className="w-full p-2 bg-gray-700 rounded border border-gray-600">
                                  <option value="usd">USD</option>
                                  <option value="eur">EUR</option>
                                  <option value="clp">CLP</option>
                                </select>
                              </div>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <button onClick={saveEditPpv} className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded">{t('save')}</button>
                            <button onClick={()=>setEditingPostId(null)} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded">{t('cancel')}</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <button onClick={()=>openEditPpv(post)} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm">{t('editMonetization') || 'Editar monetización'}</button>
                        </div>
                      )
                    )}

                    {!isOwner() && post.isExclusive && !hasAccess && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button onClick={handleSubscribeStripe} className="px-3 py-2 bg-pink-600 hover:bg-pink-700 rounded">{t('subscribe')}</button>
                        {post.ppvEnabled && (
                          <button onClick={()=>handleBuyPPV(post._id)} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded">
                            {fmt(post.ppvAmountCents || parseInt(process.env.NEXT_PUBLIC_PPV_DEFAULT_CENTS || '500', 10), post.ppvCurrency || 'usd')} · {t('buyPpv')}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* rail autenticado */}
          <SuggestionsRail />
        </div>
      </main>

      <EditProfileModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} user={user} onSave={async()=>{ await fetchProfileData(); try{ await update(); } catch{} }} />
      <ConfirmDeleteAccountModal open={deleteOpen} onClose={()=>setDeleteOpen(false)} onDeleted={async()=>{ await signOut({ callbackUrl: '/auth/login' }); }} />
    </div>
  );
}
