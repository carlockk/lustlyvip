'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { cloudinaryLoader, cloudinaryUrl } from '@/lib/cloudinaryLoader';
import { FaUserCircle } from 'react-icons/fa';
import { useLanguage } from '@/lib/i18n';

export default function PostList({ endpoint = '/api/posts' }) {
  const { data: session, status } = useSession();
  const { t, lang } = useLanguage();
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [page, setPage] = useState(0);
  const [limit] = useState(10);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef(null);
  const [imgWidth, setImgWidth] = useState(1200);
  const resizeTimerRef = useRef(null);

  const dtf = useMemo(() => {
    try { return new Intl.DateTimeFormat(lang || 'es', { dateStyle: 'medium', timeStyle: 'short' }); } catch { return null; }
  }, [lang]);

  const fetchPage = async (p = 0, append = false) => {
    const q = endpoint.includes('?') ? `${endpoint}&limit=${limit}&offset=${p * limit}` : `${endpoint}?limit=${limit}&offset=${p * limit}`;
    try {
      if (!append) { setIsLoading(true); } else { setIsLoadingMore(true); }
      const res = await fetch(q);
      if (!res.ok) throw new Error('Error');
      const data = await res.json();
      const newPosts = (data.posts || []).filter(Boolean);
      if (append) {
        const existingIds = new Set(posts.map(p => String(p._id)));
        const merged = [...posts, ...newPosts.filter(p => !existingIds.has(String(p._id)))];
        setPosts(merged);
      } else {
        setPosts(newPosts);
      }
      setHasMore(newPosts.length >= limit);
    } catch (e) {
      setError(t('postsLoadError') || 'Error');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (status !== 'loading') { setPage(0); setHasMore(true); fetchPage(0, false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, endpoint]);

  // Ajustar ancho objetivo de imágenes según viewport (para Cloudinary)
  useEffect(() => {
    const calc = () => {
      try {
        const w = typeof window !== 'undefined' ? window.innerWidth : 1200;
        const dpr = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1;
        let base;
        if (w < 640) base = 640; else if (w < 1024) base = 900; else base = 1200;
        setImgWidth(Math.round(base * dpr));
      } catch { setImgWidth(1200); }
    };
    calc();
    const onResize = () => {
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
      resizeTimerRef.current = setTimeout(calc, 150);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!hasMore || isLoading) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) {
        if (en.isIntersecting) {
          const next = page + 1;
          setPage(next);
          fetchPage(next, true);
        }
      }
    }, { rootMargin: '200px 0px' });
    io.observe(el);
    return () => { try { io.disconnect(); } catch {} };
  }, [page, hasMore, isLoading]);

  // Cargar favoritos del usuario para poder alternar agregar/quitar
  useEffect(() => {
    (async () => {
      try {
        if (!session) { setFavoriteIds(new Set()); return; }
        const r = await fetch('/api/favorites');
        if (!r.ok) return;
        const j = await r.json();
        const ids = new Set((j.favorites || []).map((u) => u._id));
        setFavoriteIds(ids);
      } catch {}
    })();
  }, [session]);

  const handleLike = async (postId) => {
    if (!session) { alert(t('mustLoginToLike') || ''); return; }
    try {
      const res = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      });
      if (!res.ok) throw new Error('Like error');
      // Optimista en memoria
      setPosts((arr)=>arr.map(p=>{
        if (String(p._id)!==String(postId)) return p;
        const liked = (p.likes||[]).some(id => String(id)===String(session.user.id));
        const newLikes = liked ? (p.likes||[]).filter(id => String(id)!==String(session.user.id)) : ([...(p.likes||[]), session.user.id]);
        return { ...p, likes: newLikes };
      }));
    } catch (e) {
      alert(t('likeErrorTryAgain') || '');
    }
  };

  const toggleFavorite = async (creatorId) => {
    if (!session) { alert(t('mustLoginToLike') || ''); return; }
    try {
      const isFav = favoriteIds.has(String(creatorId));
      const method = isFav ? 'DELETE' : 'POST';
      const r = await fetch(`/api/favorites/${creatorId}`, { method });
      if (!r.ok) throw new Error('Favorite error');
      const newSet = new Set(favoriteIds);
      if (isFav) newSet.delete(String(creatorId)); else newSet.add(String(creatorId));
      setFavoriteIds(newSet);
    } catch {
      // Silencioso o toast simple
    }
  };

  if (isLoading || status === 'loading') {
    return <div className="flex justify-center items-center h-48 text-gray-400">{t('loadingPosts') || '...'}</div>;
  }
  if (error) {
    return <div className="flex justify-center items-center h-48 text-red-500">{error}</div>;
  }
  if ((posts || []).length === 0) {
    return <div className="flex justify-center items-center h-48 text-gray-400">{t('noPostsYet') || ''}</div>;
  }

  return (
    <div className="space-y-8">
      {(posts || []).filter(Boolean).map((post) => (
        post?.creator && (
          <div key={post._id} className="bg-gray-800 p-6 rounded-lg shadow-lg cv-auto">
            <div className="flex items-center mb-4">
              <Link href={`/profile/${post.creator._id}`} className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden mr-4">
                {post.creator.profilePicture ? (
                  <Image loader={cloudinaryLoader} src={post.creator.profilePicture} alt={post.creator.username} width={40} height={40} sizes="40px" className="w-full h-full object-cover" />
                ) : (
                  <FaUserCircle className="w-full h-full text-gray-400" />
                )}
              </Link>
              <div>
                <Link href={`/profile/${post.creator._id}`} className="font-bold text-gray-100 hover:text-pink-500">
                  @{post.creator.username}
                </Link>
                <p className="text-sm text-gray-400">{dtf ? dtf.format(new Date(post.createdAt)) : new Date(post.createdAt).toLocaleString()}</p>
              </div>
            </div>

            {post.text && <p className="text-gray-200 mb-4">{post.text}</p>}

            {(post.imageUrl || post.videoUrl) && (
              <div className="mt-4">
                {(() => {
                  const rawImg = post.imageUrl || '';
                  const vid = post.videoUrl || '';
                  const isCloud = (u) => { try { return new URL(u).hostname === 'res.cloudinary.com'; } catch { return false; } };
                  const isCloudVideo = (u) => { try { const p = new URL(u).pathname; return /\/video\/upload\//.test(p); } catch { return false; } };
                  const isCloudImage = (u) => { try { const p = new URL(u).pathname; return /\/image\/upload\//.test(p); } catch { return false; } };
                  if (vid) {
                    return <video src={vid} controls playsInline preload="metadata" className="rounded-md w-full h-auto max-h-[75vh] object-contain" />;
                  }
                  // Si el imageUrl parece ser en realidad un video de Cloudinary, trátalo como video
                  if (rawImg && isCloud(rawImg) && isCloudVideo(rawImg)) {
                    return <video src={rawImg} controls playsInline preload="metadata" className="rounded-md w-full h-auto max-h-[75vh] object-contain" />;
                  }
                  // Imagen: usar la URL tal cual (sin transformar) para máxima compatibilidad
                  const src = rawImg;
                  return src ? (
                    <img src={src} alt="post" loading="lazy" decoding="async" className="rounded-md w-full h-auto max-h-[75vh] object-contain" />
                  ) : null;
                })()}
              </div>
            )}

            <div className="flex items-center mt-4 gap-4">
              <button type="button" onClick={() => handleLike(post._id)} className="flex items-center text-gray-400 hover:text-pink-500 transition-colors cursor-pointer" aria-label={t('like') || 'Me gusta'}>
                <svg className={`w-6 h-6 mr-1 ${session && (post.likes || []).some(id => String(id) === String(session.user.id)) ? 'text-pink-500' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
                <span className="font-bold">{(post.likes || []).length}</span>
              </button>
              {post.creator?._id && (
                <button
                  onClick={() => toggleFavorite(post.creator._id)}
                  className="text-xs px-3 py-1 rounded border border-gray-700 bg-gray-800 hover:bg-gray-700 cursor-pointer text-gray-200"
                  title={favoriteIds.has(String(post.creator._id)) ? (t('removeFromFavorites') || '') : (t('addToFavorites') || '')}
                >
                  {favoriteIds.has(String(post.creator._id)) ? (t('removeFromFavorites') || 'Quitar de favoritos') : (t('addToFavorites') || 'Agregar a favoritos')}
                </button>
              )}
            </div>
          </div>
        )
      ))}
      {/* Sentinel e indicadores */}
      <div ref={sentinelRef} />
      {isLoadingMore && (
        <div className="flex justify-center items-center h-16 text-gray-400">{t('loadingPosts') || '...'}</div>
      )}
      {!hasMore && posts.length > 0 && (
        <div className="flex justify-center items-center h-12 text-xs text-gray-500">No hay más publicaciones</div>
      )}
    </div>
  );
}
