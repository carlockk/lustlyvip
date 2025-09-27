'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { cloudinaryLoader } from '@/lib/cloudinaryLoader';
import { FaUserCircle } from 'react-icons/fa';
import { useLanguage } from '@/lib/i18n';

const isCloudUrl = (value) => {
  try {
    return new URL(value).hostname === 'res.cloudinary.com';
  } catch {
    return false;
  }
};

const isCloudVideo = (value) => {
  try {
    return /\/video\/upload\//.test(new URL(value).pathname);
  } catch {
    return false;
  }
};

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
  const [lightbox, setLightbox] = useState(null);

  const dtf = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(lang || 'es', { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return null;
    }
  }, [lang]);

  const fetchPage = useCallback(
    async (p = 0, append = false) => {
      const q = endpoint.includes('?')
        ? `${endpoint}&limit=${limit}&offset=${p * limit}`
        : `${endpoint}?limit=${limit}&offset=${p * limit}`;
      try {
        if (!append) {
          setIsLoading(true);
        } else {
          setIsLoadingMore(true);
        }
        const res = await fetch(q);
        if (!res.ok) throw new Error('Error');
        const data = await res.json();
        const newPosts = (data.posts || []).filter(Boolean);
        setPosts((prev) => {
          if (!append) return newPosts;
          const existingIds = new Set(prev.map((item) => String(item._id)));
          const merged = [...prev, ...newPosts.filter((item) => !existingIds.has(String(item._id)))];
          return merged;
        });
        setHasMore(newPosts.length >= limit);
      } catch (e) {
        setError(t('postsLoadError') || 'Error');
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [endpoint, limit, t]
  );

  useEffect(() => {
    if (status !== 'loading') {
      setPage(0);
      setHasMore(true);
      fetchPage(0, false);
    }
  }, [status, endpoint, fetchPage]);

  useEffect(() => {
    if (!hasMore || isLoading) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (en.isIntersecting) {
            const next = page + 1;
            setPage(next);
            fetchPage(next, true);
          }
        }
      },
      { rootMargin: '200px 0px' }
    );
    io.observe(el);
    return () => {
      try {
        io.disconnect();
      } catch {}
    };
  }, [page, hasMore, isLoading, fetchPage]);

  useEffect(() => {
    (async () => {
      try {
        if (!session) {
          setFavoriteIds(new Set());
          return;
        }
        const r = await fetch('/api/favorites');
        if (!r.ok) return;
        const j = await r.json();
        const ids = new Set((j.favorites || []).map((u) => u._id));
        setFavoriteIds(ids);
      } catch {
        // silencioso
      }
    })();
  }, [session]);

  useEffect(() => {
    if (!lightbox) return;
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const onKey = (event) => {
      if (event.key === 'Escape') {
        setLightbox(null);
      }
    };
    const { body } = document;
    const previousOverflow = body?.style?.overflow;
    if (body) {
      body.style.overflow = 'hidden';
    }
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (body) {
        body.style.overflow = previousOverflow || '';
      }
    };
  }, [lightbox]);

  const handleLike = async (postId) => {
    if (!session) {
      alert(t('mustLoginToLike') || '');
      return;
    }
    try {
      const res = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      });
      if (!res.ok) throw new Error('Like error');
      setPosts((arr) =>
        arr.map((p) => {
          if (String(p._id) !== String(postId)) return p;
          const liked = (p.likes || []).some((id) => String(id) === String(session.user.id));
          const newLikes = liked
            ? (p.likes || []).filter((id) => String(id) !== String(session.user.id))
            : [...(p.likes || []), session.user.id];
          return { ...p, likes: newLikes };
        })
      );
    } catch (e) {
      alert(t('likeErrorTryAgain') || '');
    }
  };

  const toggleFavorite = async (creatorId) => {
    if (!session) {
      alert(t('mustLoginToLike') || '');
      return;
    }
    try {
      const isFav = favoriteIds.has(String(creatorId));
      const method = isFav ? 'DELETE' : 'POST';
      const r = await fetch(`/api/favorites/${creatorId}`, { method });
      if (!r.ok) throw new Error('Favorite error');
      const newSet = new Set(favoriteIds);
      if (isFav) newSet.delete(String(creatorId));
      else newSet.add(String(creatorId));
      setFavoriteIds(newSet);
    } catch {
      // silencioso
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
    <>
      <div className="space-y-6">
        {(posts || []).filter(Boolean).map((post) => {
          if (!post?.creator) return null;

          const mediaAlt = t('postMediaAlt') || 'Contenido de la publicación';
          const fullLabel = t('viewFull') || 'Ver completo';
          const rawImg = post.imageUrl || '';
          const vid = post.videoUrl || '';

          let mediaInfo = null;
          if (vid) {
            mediaInfo = {
              type: 'video',
              src: vid,
              alt: mediaAlt,
              element: (
                <video
                  src={vid}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full max-h-[420px] object-contain"
                />
              ),
            };
          } else if (rawImg && isCloudUrl(rawImg) && isCloudVideo(rawImg)) {
            mediaInfo = {
              type: 'video',
              src: rawImg,
              alt: mediaAlt,
              element: (
                <video
                  src={rawImg}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full max-h-[420px] object-contain"
                />
              ),
            };
          } else if (rawImg) {
            mediaInfo = {
              type: 'image',
              src: rawImg,
              alt: mediaAlt,
              element: (
                <img
                  src={rawImg}
                  alt={mediaAlt}
                  loading="lazy"
                  decoding="async"
                  className="w-full max-h-[420px] object-contain"
                />
              ),
            };
          }

          return (
            <div key={post._id} className="bg-gray-800/90 border border-gray-700/60 p-5 sm:p-6 rounded-2xl shadow-lg">
              <div className="flex items-center mb-4">
                <Link href={`/profile/${post.creator._id}`} className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden mr-4">
                  {post.creator.profilePicture ? (
                    <Image
                      loader={cloudinaryLoader}
                      src={post.creator.profilePicture}
                      alt={post.creator.username}
                      width={40}
                      height={40}
                      sizes="40px"
                      className="w-full h-full object-cover"
                    />
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

              {post.text && <p className="text-gray-200 mb-4 leading-relaxed whitespace-pre-wrap">{post.text}</p>}

              {mediaInfo && (
                <div className="mt-4">
                  <div className="relative rounded-xl overflow-hidden bg-black/30 flex justify-center">
                    {mediaInfo.element}
                    <button
                      type="button"
                      onClick={() => setLightbox({ type: mediaInfo.type, src: mediaInfo.src, alt: mediaInfo.alt })}
                      className="absolute bottom-3 right-3 px-3 py-1.5 text-xs font-semibold bg-black/70 text-white rounded-full hover:bg-black/80 transition-colors"
                    >
                      {fullLabel}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center mt-4 gap-4">
                <button
                  type="button"
                  onClick={() => handleLike(post._id)}
                  className="flex items-center text-gray-400 hover:text-pink-500 transition-colors cursor-pointer"
                  aria-label={t('like') || 'Me gusta'}
                >
                  <svg
                    className={`w-6 h-6 mr-1 ${session && (post.likes || []).some((id) => String(id) === String(session.user.id)) ? 'text-pink-500' : 'text-gray-400'}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-bold">{(post.likes || []).length}</span>
                </button>
                {post.creator?._id && (
                  <button
                    onClick={() => toggleFavorite(post.creator._id)}
                    className="text-xs px-3 py-1 rounded border border-gray-700 bg-gray-800 hover:bg-gray-700 cursor-pointer text-gray-200"
                    title={favoriteIds.has(String(post.creator._id)) ? (t('removeFromFavorites') || '') : (t('addToFavorites') || '')}
                  >
                    {favoriteIds.has(String(post.creator._id))
                      ? (t('removeFromFavorites') || 'Quitar de favoritos')
                      : (t('addToFavorites') || 'Agregar a favoritos')}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        <div ref={sentinelRef} />
        {isLoadingMore && (
          <div className="flex justify-center items-center h-16 text-gray-400">{t('loadingPosts') || '...'}</div>
        )}
        {!hasMore && posts.length > 0 && (
          <div className="flex justify-center items-center h-12 text-xs text-gray-500">No hay más publicaciones</div>
        )}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative max-w-5xl w-full"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightbox(null)}
              className="absolute -top-12 right-0 text-sm text-gray-100 hover:text-white"
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
    </>
  );
}
