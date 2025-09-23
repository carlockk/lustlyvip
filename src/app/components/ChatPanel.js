"use client";

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { FaFacebookMessenger } from 'react-icons/fa';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n';

export default function ChatPanel() {
  const { data: session } = useSession();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const toggleRef = useRef(null);
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const listRef = useRef(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const loadConversations = async () => {
    try {
      const r = await fetch('/api/messages');
      if (!r.ok) return;
      const j = await r.json();
      setConversations(j.conversations || []);
      if (!selectedUser && (j.conversations||[]).length > 0) setSelectedUser(j.conversations[0].otherUser);
      // calcular no leídos aproximado
      try {
        const me = session?.user?.id;
        let count = 0;
        for (const c of (j.conversations||[])) {
          const last = c.lastMessage;
          if (!last) continue;
          const otherId = c.otherUser?._id;
          const key = `lustly_chat_read_${otherId}`;
          const seenAt = parseInt(localStorage.getItem(key) || '0', 10) || 0;
          const lastAt = last?.createdAt ? new Date(last.createdAt).getTime() : 0;
          const isFromOther = String(last.senderId) !== String(me);
          if (isFromOther && lastAt > seenAt) count++;
        }
        setUnreadCount(count);
      } catch {}
    } catch {}
  };

  const loadMessages = async (userId) => {
    try {
      const r = await fetch(`/api/messages?userId=${encodeURIComponent(userId)}`);
      if (!r.ok) return;
      const j = await r.json();
      setMessages(j.messages || []);
      setTimeout(() => { try { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }); } catch {} }, 20);
    } catch {}
  };

  useEffect(() => {
    if (open && session) loadConversations();
  }, [open, session]);

  useEffect(() => { if (selectedUser) loadMessages(selectedUser._id); }, [selectedUser]);

  // Cerrar al hacer click fuera del panel
  useEffect(() => {
    const onDown = (e) => {
      if (!open) return;
      const panel = panelRef.current;
      const toggle = toggleRef.current;
      if (panel && !panel.contains(e.target) && (!toggle || !toggle.contains(e.target))) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const sendMessage = async (e) => {
    e?.preventDefault?.();
    const text = newMessage.trim();
    if (!text || !selectedUser) return;
    try {
      const res = await fetch('/api/messages', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ receiverId: selectedUser._id, text }) });
      if (!res.ok) return;
      const j = await res.json();
      setMessages((m)=>[...m, j.message]);
      setNewMessage('');
      setTimeout(() => { try { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }); } catch {} }, 20);
    } catch {}
  };

  if (!session) return null;

  return (
    <>
      {/* Floating button */}
      <button
        ref={toggleRef}
        onClick={() => setOpen((v)=>!v)}
        className="fixed bottom-4 right-4 z-50 p-3 rounded-full bg-pink-600 hover:bg-pink-700 text-white shadow-lg"
        aria-label="Abrir chat"
      >
        <FaFacebookMessenger className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] leading-none px-1.5 py-1 rounded-full border border-white">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      <div ref={panelRef} className={`fixed bottom-4 right-4 z-50 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-2xl transition-all ${open ? 'w-[88vw] md:w-[720px] h-[70vh]' : 'w-0 h-0 pointer-events-none'}`}>
        {open && (
          <div className="flex h-full w-full flex-col">
            <div className="flex items-center justify-between p-2 border-b border-gray-800 text-sm">
              <div className="font-semibold text-gray-200">Messenger</div>
              <button onClick={()=>setOpen(false)} aria-label="Cerrar chat" className="px-2 py-1 rounded hover:bg-gray-800 text-gray-300">✕</button>
            </div>
            <div className="flex flex-1 w-full">
            {/* Conversations */}
            <div className="w-2/5 bg-gray-800 h-full border-r border-gray-700 flex flex-col">
              <div className="p-3 border-b border-gray-700 text-sm font-semibold">{t('messagesTitleFull')}</div>
              <div className="p-2 border-b border-gray-700">
                <input
                  value={query}
                  onChange={async (e)=>{
                    const v = e.target.value; setQuery(v);
                    if (!v) { setResults([]); return; }
                    setSearching(true);
                    try {
                      const r = await fetch(`/api/users/search?q=${encodeURIComponent(v)}`);
                      const j = await r.json();
                      setResults(j.users || []);
                    } catch { setResults([]); }
                    finally { setSearching(false); }
                  }}
                  placeholder={t('searchCreatorPlaceholder')}
                  className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm"
                />
                {searching && <div className="text-[11px] text-gray-400 mt-1">{t('searching')}</div>}
                {results.length>0 && (
                  <div className="max-h-40 overflow-y-auto mt-2 border border-gray-700 rounded">
                    {results.map(u => (
                      <button key={u._id} onClick={()=>{ setSelectedUser(u); setResults([]); setQuery(''); }} className="w-full text-left flex items-center gap-2 px-2 py-1 hover:bg-gray-700">
                        <img src={u.profilePicture || '/images/placeholder-avatar.png'} alt={u.username} className="w-6 h-6 rounded-full object-cover" />
                        <span className="text-xs">@{u.username}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-y-auto">
                {(conversations||[]).map((c)=>(
                  <button key={c.otherUser?._id} onClick={()=>{
                    setSelectedUser(c.otherUser);
                    try { localStorage.setItem(`lustly_chat_read_${c.otherUser?._id}`, String(Date.now())); loadConversations(); } catch {}
                  }} className={`w-full flex items-center gap-2 p-3 text-left hover:bg-gray-700 ${selectedUser?._id===c.otherUser._id?'bg-gray-700':''}`}>
                    <img src={c.otherUser.profilePicture || '/images/placeholder-avatar.png'} alt={c.otherUser.username} className="w-8 h-8 rounded-full object-cover" />
                    <div className="flex-1">
                      <div className="text-sm font-semibold">@{c.otherUser.username}</div>
                      <div className="text-[11px] text-gray-400 truncate">{c.lastMessage?.text || t('noMessages')}</div>
                    </div>
                  </button>
                ))}
                {(conversations||[]).length===0 && (
                  <div className="p-3 text-xs text-gray-400">{t('noConversations')}</div>
                )}
              </div>
              <div className="p-2 text-right border-t border-gray-700">
                <Link href="/messages" className="text-xs text-gray-300 hover:underline">{t('messagesTitleFull')}</Link>
              </div>
            </div>
            {/* Thread */}
            <div className="flex-1 h-full flex flex-col">
              {selectedUser ? (
                <>
                  <div className="p-3 border-b border-gray-700 flex items-center gap-2">
                    <img src={selectedUser.profilePicture || '/images/placeholder-avatar.png'} alt={selectedUser.username} className="w-8 h-8 rounded-full object-cover" />
                    <div className="font-semibold">@{selectedUser.username}</div>
                    <div className="ml-auto">
                      <Link href={`/profile/${selectedUser._id}`} className="text-xs text-gray-300 hover:underline">Perfil</Link>
                    </div>
                  </div>
                  <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-2">
                    {(messages||[]).map(m => (
                      <div key={m._id} className={`flex ${String(m.senderId)===String(session.user.id) ? 'justify-end' : 'justify-start'}`}>
                        <div className={`px-3 py-2 rounded-lg max-w-[70%] ${String(m.senderId)===String(session.user.id) ? 'bg-pink-600 text-white' : 'bg-gray-700 text-gray-100'}`}>{m.text}</div>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={sendMessage} className="p-3 border-t border-gray-700 flex items-center gap-2">
                    <input value={newMessage} onChange={e=>setNewMessage(e.target.value)} placeholder={t('writeMessagePlaceholder')} className="flex-1 bg-gray-800 border border-gray-700 rounded-full px-3 py-2 text-sm" />
                    <button className="px-3 py-2 bg-pink-600 hover:bg-pink-700 rounded text-sm">Enviar</button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-sm text-gray-400">{t('selectConversation')}</div>
              )}
            </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
