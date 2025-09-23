"use client";

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaPaperPlane } from 'react-icons/fa';
import EditProfileModal from '../../components/EditProfileModal';
import ConfirmDeleteAccountModal from '../../components/ConfirmDeleteAccountModal';
import { signOut } from 'next-auth/react';
import DatePicker from '../../components/DatePicker';
import { useLanguage } from '@/lib/i18n';

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

  const snippet = (txt) => { if (!txt) return ''; const s = String(txt).trim(); return s.length > 100 ? s.slice(0, 100) + '…' : s; };
  const fmt = (cents, cur='usd') => { const C = (cur||'usd').toUpperCase(); return C === 'CLP' ? `${cents} ${C}` : `$${(cents/100).toFixed(2)} ${C}`; };

  const isOwner = () => { try { return session && session.user?.id && (session.user.id === profileId || session.user.id === user?._id); } catch { return false; } };

  const openBillingPortal = async () => {
    try {
      const endpoint = process.env.NODE_ENV === 'production' ? '/api/stripe/portal' : '/api/stripe/portal/dev';
      const res = await fetch(endpoint, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || (t('openStripePortal') || ''));
      window.location.href = data.url;
    } catch (e) { alert(e.message); }
  };

  const shareProfile = async () => {
    try {
      const url = typeof window !== 'undefined' ? window.location.href : '';
      if (navigator.share) {
        await navigator.share({ title: `@${user?.username}`, url });
      } else {
        await navigator.clipboard.writeText(url);
        setToast({ type: 'success', msg: t('share') || 'Compartido' });
      }
    } catch {
      alert(t('shareNotSupported') || 'Tu navegador no soporta la función de compartir.');
    }
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
    if (!session) { alert(t('mustLoginToLike') || ''); return; }
    try {
      const method = isFavorite ? 'DELETE' : 'POST';
      const r = await fetch(`/api/favorites/${profileId}`, { method });
      if (!r.ok) throw new Error('Error');
      setIsFavorite(!isFavorite);
      if (!isFavorite) setToast({ type: 'success', msg: t('addedToFavorites') || '' });
    } catch {}
  };

  // Likes en publicaciones del perfil
  const handleLike = async (postId) => {
    if (!session) { alert(t('mustLoginToLike') || ''); return; }
    try {
      const res = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      });
      if (!res.ok) throw new Error('Like error');
      // Actualización optimista en el estado local
      setPosts((arr)=>arr.map(p=>{
        if (String(p._id)!==String(postId)) return p;
        const liked = (p.likes||[]).some(id => String(id) === String(session.user.id));
        const newLikes = liked
          ? (p.likes||[]).filter(id => String(id) !== String(session.user.id))
          : ([...(p.likes||[]), session.user.id]);
        return { ...p, likes: newLikes };
      }));
    } catch (e) {
      alert(t('likeErrorTryAgain') || '');
    }
  };

  const handleSubscribeStripe = async () => {
    if (!session) { alert(t('mustLoginToSubscribe') || ''); return; }
    try {
      const priceRes = await fetch(`/api/creators/${profileId}/price`);
      const priceData = await priceRes.json();
      if (!priceRes.ok) throw new Error(priceData.message || '');
      const plans = (priceData.plans || []).filter(p => !!p.priceId);
      if (!plans.length) {
        // Sin precio: suscripción gratuita (solo contenido público)
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
      let autoCancelAtPeriodEnd = false;
      if (!autoRenew) autoCancelAtPeriodEnd = true;
      if (customEndDate) {
        const d = new Date(customEndDate + 'T23:59:59');
        const ts = Math.floor(d.getTime() / 1000);
        if (Number.isFinite(ts) && ts > Math.floor(Date.now()/1000)) { cancelAt = ts; autoCancelAtPeriodEnd = false; }
      }
      // Si hay duración personalizada y existe plan diario, usar el priceId diario para cobrar por día
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

  // Estado de Stripe Connect (solo para el dueño del perfil)
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
  }, [status, session, profileId]);

  useEffect(() => { if (status !== 'loading') fetchProfileData(); }, [session, profileId, status, activeTab]);
  useEffect(() => { if (status !== 'loading') refreshIsFavorite(); }, [status, session, profileId]);

  if (isLoading || status === 'loading') {
    return <div className="flex min-h-screen items-center justify-center bg-gray-900 text-gray-100 text-2xl">{t('loadingGeneric')}</div>;
  }
  if (error) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-900 text-gray-100 text-2xl">{error}</div>;
  }
  if (!user) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-900 text-gray-100 text-2xl">{t('userNotFound') || 'Usuario no encontrado'}</div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-gray-100">
      {toast && (<div className={`fixed top-4 right-4 px-4 py-2 rounded shadow ${toast.type==='error' ? 'bg-red-600' : 'bg-green-600'}`}>{toast.msg}</div>)}

      <header className="relative w-full h-48 bg-gray-800">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${user.coverPhoto || '/images/placeholder-cover.jpg'})` }}></div>
        <div className="absolute -bottom-16 left-8 w-32 h-32 rounded-full border-4 border-gray-900 bg-gray-700 overflow-hidden">
          <img src={user.profilePicture || '/images/placeholder-avatar.png'} alt="Profile" className="w-full h-full object-cover" />
        </div>
      </header>

      <main className="flex-1 p-8 pt-20">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">@{user.username}</h1>
            <p className="text-gray-400 mt-1">{user.email}</p>
            <p className="mt-4">{user.bio || t('defaultBio') || ''}</p>
          </div>

          <div className="flex flex-wrap gap-2 mb-8">
            {session && session.user.id !== profileId ? (
              <>
                {!isSubscribed ? (
                  <button onClick={handleSubscribeStripe} className="py-2 px-4 rounded-full font-bold transition-colors cursor-pointer bg-pink-600 hover:bg-pink-700">{t('subscribe')}</button>
                ) : creatorHasPrice ? (
                  <button onClick={async()=>{ try{ const res = await fetch('/api/stripe/subscription/cancel', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ creatorId: profileId })}); const j = await res.json(); if(!res.ok) throw new Error(j.message||'Error'); setIsSubscribed(false); setToast({type:'success', msg:t('subscriptionCancelled')||''}); }catch(e){ setToast({type:'error', msg:e.message}); } }} className="py-2 px-4 rounded-full font-bold bg-gray-700 hover:bg-gray-600 transition-colors cursor-pointer">{t('cancelSubscription')}</button>
                ) : (
                  <button onClick={async()=>{ try{ const r = await fetch('/api/subscriptions', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ creatorId: profileId }) }); if (!r.ok) throw new Error('Error'); setIsSubscribed(false); } catch(e){ setToast({type:'error', msg: e.message}); } }} className="py-2 px-4 rounded-full font-bold bg-gray-700 hover:bg-gray-600 transition-colors cursor-pointer">{t('cancelSubscription')}</button>
                )}
                <button onClick={()=>{ if (!session) { alert(t('mustLoginForMessages') || ''); return; } router.push(`/messages?userId=${profileId}`); }} className="py-2 px-4 rounded-full font-bold bg-gray-700 hover:bg-gray-600 transition-colors cursor-pointer flex items-center gap-2"><FaPaperPlane /> <span>{t('message')}</span></button>
                {planMenuOpen && (
                  <div className="w-full mt-2 p-4 rounded-lg border border-gray-700 bg-gray-800 max-h-[70vh] overflow-y-auto">
                    <div className="text-sm font-semibold mb-2">{t('choosePlan') || 'Elige un plan'}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                      {(availablePlans||[]).map(pl => (
                        <button key={pl.key} onClick={()=>setSelectedPlan(pl)} className={`p-2 rounded border ${selectedPlan?.key===pl.key ? 'border-pink-600' : 'border-gray-700'} bg-gray-900 hover:bg-gray-700 text-left`}>
                          <div className="text-sm text-gray-100 font-semibold">{pl.label}</div>
                          <div className="text-xs text-gray-400">
                            {pl.amount ? ((pl.currency||'usd').toUpperCase()==='CLP' ? `${pl.amount} ${(pl.currency||'usd').toUpperCase()}` : `$${(pl.amount/100).toFixed(2)} ${(pl.currency||'usd').toUpperCase()}`) : '—'}
                            {pl.introPercent>0 ? ` · -${pl.introPercent}% 1ª compra` : ''}
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-3 relative">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={autoRenew} onChange={e=>setAutoRenew(e.target.checked)} />
                        <span>{t('autoRenew') || 'Renovar automáticamente'}</span>
                      </label>
                      <div className="flex items-center gap-2 text-sm">
                        <span>{t('customDuration') || 'Duración personalizada'}:</span>
                        <button type="button" onClick={() => setShowDatePicker(v=>!v)} className="px-2 py-1 rounded border border-gray-700 bg-gray-900 hover:bg-gray-700">
                          {customEndDate || (t('chooseDate') || 'Elegir fecha')}
                        </button>
                      </div>
                      {showDatePicker && (
                        <div className="absolute top-full left-0 mt-2 z-20">
                          <DatePicker
                            value={customEndDate || ''}
                            minDate={new Date()}
                            onChange={(iso) => { setCustomEndDate(iso); setShowDatePicker(false); }}
                            onClose={() => setShowDatePicker(false)}
                          />
                        </div>
                      )}
                    </div>
                    {customEndDate && (availablePlans||[]).some(p => p.key==='day_1' && p.amount) && (
                      <div className="text-xs text-gray-400 mb-3">
                        {(() => {
                          try {
                            const dayPlan = (availablePlans||[]).find(p => p.key==='day_1');
                            const end = new Date(customEndDate + 'T23:59:59');
                            const now = new Date();
                            const days = Math.max(1, Math.ceil((end - now) / (1000*60*60*24)));
                            const amt = dayPlan.amount || 0;
                            const cur = (dayPlan.currency||'usd').toUpperCase();
                            const total = cur==='CLP' ? `${amt*days} ${cur}` : `$${((amt*days)/100).toFixed(2)} ${cur}`;
                            return `${t('estimatedCost') || 'Costo estimado'}: ${total}`;
                          } catch { return null; }
                        })()}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button onClick={startSubscriptionCheckout} className="px-3 py-2 rounded bg-pink-600 hover:bg-pink-700">{t('subscribe') || 'Suscribirse'}</button>
                      <button onClick={()=>setPlanMenuOpen(false)} className="px-3 py-2 rounded bg-gray-700 hover:bg-gray-600">{t('cancel') || 'Cancelar'}</button>
                    </div>
                  </div>
                )}
                <button onClick={toggleFavorite} className="py-2 px-4 rounded-full font-bold bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-colors cursor-pointer">
                  {isFavorite ? (t('removeFromFavorites') || 'Quitar de favoritos') : (t('addToFavorites') || 'Agregar a favoritos')}
                </button>
                <button onClick={shareProfile} className="py-2 px-4 rounded-full font-bold bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-colors cursor-pointer">
                  {t('share') || 'Compartir'}
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setIsModalOpen(true)} className="py-2 px-4 rounded-full font-bold bg-pink-600 hover:bg-pink-700 transition-colors">{t('editProfile')}</button>
                <button onClick={shareProfile} className="py-2 px-4 rounded-full font-bold bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-colors cursor-pointer">
                  {t('share') || 'Compartir'}
                </button>
                <button onClick={()=>setDeleteOpen(true)} className="py-2 px-4 rounded-full font-bold bg-red-600 hover:bg-red-700 transition-colors cursor-pointer">
                  {t('deleteAccount') || 'Eliminar cuenta'}
                </button>

                {/* Acceso rápido Stripe Connect */}
                <div className="w-full mt-2 flex flex-wrap items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded ${connect.connected ? (connect.chargesEnabled ? 'bg-green-700 text-green-100' : 'bg-yellow-700 text-yellow-100') : 'bg-gray-700 text-gray-300'}`}>
                    {`Pagos: ${connect.connected ? (connect.chargesEnabled ? 'Conectado y listo para cobrar' : 'Conectado, pendiente de verificación') : 'No conectado'}`}
                  </span>
                  {connect.accountId && (
                    <span className="text-xs text-gray-400">{`Cuenta: ${connect.accountId}`}</span>
                  )}
                  {!connect.connected ? (
                    <button
                      onClick={async()=>{ try{ setConnect(c=>({ ...c, loading:true, error:null })); const r = await fetch('/api/stripe/connect/onboard', { method:'POST' }); const j = await r.json(); if(!r.ok) throw new Error(j.message||'Error'); window.location.href = j.url; } catch(e){ setConnect(c=>({ ...c, loading:false, error:e.message })); } }}
                      className={`px-3 py-2 rounded ${connect.loading ? 'bg-gray-600' : 'bg-pink-600 hover:bg-pink-700'}`}
                    >{connect.loading ? 'Abriendo…' : 'Conectar pagos (Stripe)'}</button>
                  ) : (
                    <button
                      onClick={async()=>{ try{ setConnect(c=>({ ...c, loading:true, error:null })); const r = await fetch('/api/stripe/connect/status', { method:'POST' }); const j = await r.json(); if(!r.ok) throw new Error(j.message||'Error'); setConnect(c=>({ ...c, ...j, loading:false })); } catch(e){ setConnect(c=>({ ...c, loading:false, error:e.message })); } }}
                      className={`px-3 py-2 rounded ${connect.loading ? 'bg-gray-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                    >Revisar estado</button>
                  )}
                  {connect.error && <span className="text-xs text-red-400">{connect.error}</span>}
                </div>
              </>
            )}
          </div>

          {isSubscribed && subscriptionMode === 'free' && (
            <div className="mb-6 p-3 rounded-lg border border-yellow-700 bg-yellow-900/20 text-yellow-200">
              <div className="text-sm font-semibold">{t('freeSubscription') || 'Suscripción free'}</div>
              <div className="text-xs">{t('freeSubscriptionNote') || 'Solo verás contenido público. Para exclusivos compra PPV.'}</div>
            </div>
          )}

          <nav className="border-b border-gray-700 mb-8"><ul className="flex space-x-8"><li className="pb-2 border-b-2 border-pink-600"><span className="font-bold text-pink-500">{t('posts')}</span></li></ul></nav>

          <div className="space-y-8">
            {(posts || []).map((post) => {
              const hasAccess = !!accessMap[post._id] || !post.isExclusive;
              const mediaUrl = post.videoUrl || post.imageUrl || null;
              const isVideo = !!post.videoUrl || (post.imageUrl && !/\.(jpeg|jpg|gif|png|webp)$/i.test(post.imageUrl||''));
              const showEdit = isOwner();
              return (
                <div key={post._id} className="bg-gray-800 p-6 rounded-lg shadow-lg">
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
                      <div className="mb-3 flex gap-2 items-center">
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

                  <div className="text-xs text-gray-400 mb-3">{t('publishedOn') || 'Publicado el'} {dtf ? dtf.format(new Date(post.createdAt)) : new Date(post.createdAt).toLocaleDateString()}</div>

                  {/* Acción: Me gusta */}
                  <div className="flex items-center gap-4 mb-2">
                    <button type="button" onClick={() => handleLike(post._id)} className="flex items-center text-gray-400 hover:text-pink-500 transition-colors cursor-pointer" aria-label={t('like') || 'Me gusta'}>
                      <svg className={`w-6 h-6 mr-1 ${session && (post.likes || []).some(id => String(id) === String(session.user.id)) ? 'text-pink-500' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                      </svg>
                      <span className="font-bold">{(post.likes || []).length}</span>
                    </button>
                  </div>

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
                        <button onClick={()=>handleBuyPPV(post._id)} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded">{fmt(post.ppvAmountCents || parseInt(process.env.NEXT_PUBLIC_PPV_DEFAULT_CENTS || '500', 10), post.ppvCurrency || 'usd')} · {t('buyPpv')}</button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <EditProfileModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} user={user} onSave={async()=>{ await fetchProfileData(); try{ await update(); } catch{} }} />
      <ConfirmDeleteAccountModal open={deleteOpen} onClose={()=>setDeleteOpen(false)} onDeleted={async()=>{ await signOut({ callbackUrl: '/auth/login' }); }} />
    </div>
  );
}
