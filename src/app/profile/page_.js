"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import EditProfileModal from '../components/EditProfileModal';
import { signOut } from 'next-auth/react';
import { useLanguage } from '@/lib/i18n';
import ConfirmDeleteAccountModal from '../components/ConfirmDeleteAccountModal';
import ConfirmDeleteAccountModal from '../components/ConfirmDeleteAccountModal';

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const { t } = useLanguage();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const fetchUserDataAndPosts = async () => {
    try {
      const res = await fetch(`/api/posts/profile/${session.user.id}`);
      if (!res.ok) throw new Error('Error');
      const data = await res.json();
      setUser(data.user);
      setPosts(data.posts);
    } catch (e) {
      console.error('Error fetching profile data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login');
    if (status === 'authenticated' && session) fetchUserDataAndPosts();
  }, [status, router, session]);

  useEffect(() => {
    let active = true;
    (async()=>{ try{ if(!session){ setIsCreator(false); return;} const r = await fetch('/api/me/flags'); const j = await r.json(); if(active) setIsCreator(!!j.isCreator);}catch{ if(active) setIsCreator(false);} })();
    return ()=>{ active = false; };
  }, [session]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Perfil de @${user.username}`,
          text: `Echa un vistazo al perfil de @${user.username} en Lustly.`,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Error al compartir:', error);
      }
    } else {
      alert(t('shareNotSupported') || '');
    }
  };

  const handleDeletePost = async (postId) => {
    if (window.confirm(t('confirmDeletePost') || '')) {
      try {
        const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
        if (res.ok) {
          setPosts(posts.filter((post) => post._id !== postId));
        } else {
          const data = await res.json();
          alert(data.message || (t('deletePostError') || ''));
        }
      } catch (error) {
        console.error('Error de red:', error);
        alert(t('connectionError') || '');
      }
    }
  };

  const handleProfileSave = () => { fetchUserDataAndPosts(); update(); };

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 text-gray-100">
        {t('loadingProfile') || '...'}
      </div>
    );
  }

  if (!session || !user) return null;

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-gray-100">
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
            <p className="mt-4">{user.bio || (t('defaultBio') || '')}</p>
          </div>

          <div className="flex space-x-4 mb-8">
            <button onClick={() => setIsModalOpen(true)} className="py-2 px-4 rounded-full font-bold bg-pink-600 hover:bg-pink-700 transition-colors">{t('editProfile')}</button>
            <button onClick={handleShare} className="py-2 px-4 rounded-full font-bold bg-gray-700 hover:bg-gray-600 transition-colors">{t('share')}</button>
            {!isCreator && (
              <button onClick={async()=>{ try{ const r = await fetch('/api/me/role', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ role:'creator' })}); if(!r.ok) throw new Error(); setIsCreator(true); router.push('/monetization'); }catch{ alert(t('becomeCreatorError')||''); } }} className="py-2 px-4 rounded-full font-bold bg-blue-600 hover:bg-blue-700 transition-colors">{t('becomeCreator') || 'Conviértete en creador'}</button>
            )}
          </div>

          <nav className="border-b border-gray-700 mb-8">
            <ul className="flex space-x-8">
              <li className="pb-2 border-b-2 border-pink-600">
                <span className="font-bold text-pink-500">{t('posts')}</span>
              </li>
            </ul>
          </nav>

          {/* Danger zone: eliminar cuenta */}
          <div className="mb-8 p-4 border border-red-800/50 rounded-lg bg-red-900/10">
            <div className="text-sm font-semibold text-red-400 mb-1">{t('deleteAccount') || 'Eliminar cuenta'}</div>
            <p className="text-xs text-gray-400 mb-3">{t('deleteAccountDesc') || 'Esta acción es permanente y eliminará tu perfil, publicaciones, mensajes y suscripciones.'}</p>
            <button
              className="px-3 py-2 rounded bg-red-600 hover:bg-red-700 text-sm"
              onClick={async()=>{
                const conf = prompt(t('confirmDeleteAccountPrompt') || 'Escribe ELIMINAR para confirmar');
                if (!conf || conf.toUpperCase() !== 'ELIMINAR') return;
                const pwd = prompt(t('enterPasswordToConfirm') || 'Ingresa tu contraseña para confirmar');
                if (!pwd) return;
                try {
                  const r = await fetch('/api/me/delete', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ password: pwd }) });
                  const j = await r.json().catch(()=>({}));
                  if (!r.ok) throw new Error(j.message || '');
                  alert(t('accountDeleted') || 'Cuenta eliminada');
                  await signOut({ callbackUrl: '/auth/login' });
                } catch (e) {
                  alert(t('deleteAccountError') || 'No se pudo eliminar la cuenta');
                }
              }}
            >
              {t('deleteAccount') || 'Eliminar cuenta'}
            </button>
          </div>

          {posts.length > 0 ? (
            <div className="space-y-8">
              {posts.map((post) => (
                <div key={post._id} className="bg-gray-800 p-6 rounded-lg shadow-lg">
                  {(() => {
                    const imgRe = /\.(jpeg|jpg|gif|png|webp)$/i;
                    const mediaUrl = post.videoUrl || post.imageUrl || null;
                    if (!mediaUrl) return null;
                    const looksVideo = !!(post.videoUrl || (post.imageUrl && !imgRe.test(post.imageUrl)));
                    return looksVideo ? (
                      <div className="mb-4"><video src={mediaUrl} controls playsInline className="w-full h-auto max-h-[75vh] rounded-lg object-contain" /></div>
                    ) : (
                      <div className="mb-4"><img src={mediaUrl} alt="post" className="w-full h-auto max-h-[75vh] rounded-lg object-contain" /></div>
                    );
                  })()}
                  <p className="text-gray-200">{post.text}</p>
                  <p className="text-sm text-gray-400 mt-2">{t('publishedOn') || 'Publicado el'} {new Date(post.createdAt).toLocaleDateString()}</p>
                  <button onClick={() => handleDeletePost(post._id)} className="mt-4 py-1 px-3 rounded-full font-bold text-white bg-red-600 hover:bg-red-700 transition-colors">{t('delete')}</button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-400 text-center">{t('noOwnPostsYet')}</div>
          )}
        </div>
      </main>
      <EditProfileModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} user={user} onSave={handleProfileSave} />
      {/* Botón flotante para abrir modal de eliminación */}
      <button
        onClick={()=> setDeleteOpen(true)}
        title={t('deleteAccount') || 'Eliminar cuenta'}
        className="fixed bottom-6 right-6 px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-sm"
      >
        {t('deleteAccount') || 'Eliminar cuenta'}
      </button>
      <ConfirmDeleteAccountModal
        open={deleteOpen}
        onClose={()=> setDeleteOpen(false)}
        onDeleted={async()=>{ await signOut({ callbackUrl: '/auth/login' }); }}
      />
    </div>
  );
}
