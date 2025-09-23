'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { FaPaperPlane } from 'react-icons/fa';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n';

export default function MessagesPage() {
  const { data: session, status } = useSession();
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const initialUserId = searchParams.get('userId');

  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchConversations = async () => {
      if (status === 'authenticated') {
        try {
          const res = await fetch(`/api/messages`);
          if (!res.ok) throw new Error('Failed to fetch conversations');
          const data = await res.json();
          setConversations(data.conversations);
          if (initialUserId) {
            const userToSelect = data.conversations.find((conv) => conv.otherUser._id === initialUserId);
            if (userToSelect) {
              setSelectedUser(userToSelect.otherUser);
            } else {
              const profileRes = await fetch(`/api/users/${initialUserId}`);
              if (profileRes.ok) {
                const profileData = await profileRes.json();
                setSelectedUser(profileData.user);
              }
            }
          }
          setIsLoading(false);
        } catch (error) {
          console.error('Error fetching conversations:', error);
          setIsLoading(false);
        }
      }
    };
    fetchConversations();
  }, [status, initialUserId]);

  useEffect(() => {
    if (selectedUser) {
      const fetchMessages = async () => {
        try {
          const res = await fetch(`/api/messages?userId=${selectedUser._id}`);
          if (!res.ok) throw new Error('Failed to fetch messages');
          const data = await res.json();
          setMessages(data.messages);
        } catch (error) {
          console.error('Error fetching messages:', error);
        }
      };
      fetchMessages();
    }
  }, [selectedUser]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: selectedUser._id, text: newMessage }),
      });
      if (!res.ok) throw new Error('Failed to send message');
      const sentMessage = await res.json();
      setMessages((prevMessages) => [...prevMessages, sentMessage.message]);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (status === 'loading' || isLoading) {
    return <div className="text-center text-gray-400">{t('loadingMessages')}</div>;
  }

  if (status === 'unauthenticated') {
    return <div className="text-center text-gray-400">{t('mustLoginForMessages')}</div>;
  }

  return (
    <div className="flex h-full bg-gray-900 text-white">
      <div className="w-1/4 bg-gray-800 p-4 border-r border-gray-700">
        <h2 className="text-xl font-bold mb-4">{t('messagesTitleFull')}</h2>
        <div className="space-y-2">
          {conversations.length > 0 ? (
            conversations.map((conv) => (
              <div
                key={conv.otherUser?._id}
                onClick={() => setSelectedUser(conv.otherUser)}
                className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedUser?._id === conv.otherUser._id ? 'bg-pink-600' : 'hover:bg-gray-700'
                }`}
              >
                <img
                  src={conv.otherUser.profilePicture || '/images/placeholder-avatar.png'}
                  alt={conv.otherUser.username}
                  className="w-10 h-10 rounded-full mr-3 object-cover"
                />
                <div>
                  <h3 className="font-semibold">{conv.otherUser.username}</h3>
                  <p className="text-sm text-gray-400">{conv.lastMessage?.text || t('noMessages')}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-sm">{t('noConversations')}</p>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            <div className="bg-gray-800 p-4 border-b border-gray-700 flex items-center">
              <Link href={`/profile/${selectedUser._id}`}>
                <img
                  src={selectedUser.profilePicture || '/images/placeholder-avatar.png'}
                  alt={selectedUser.username}
                  className="w-10 h-10 rounded-full mr-4 object-cover cursor-pointer"
                />
              </Link>
              <h2 className="text-lg font-bold">{selectedUser.username}</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div key={msg._id} className={`flex ${msg.senderId === session.user.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-3 rounded-lg max-w-xs ${msg.senderId === session.user.id ? 'bg-pink-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
                    <p>{msg.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={handleSendMessage} className="bg-gray-800 p-4 flex items-center border-t border-gray-700">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={t('writeMessagePlaceholder')}
                className="flex-1 bg-gray-700 text-white border-none rounded-full px-4 py-2 focus:outline-none"
              />
              <button type="submit" className="ml-4 p-2 rounded-full bg-pink-600 text-white hover:bg-pink-700 transition-colors">
                <FaPaperPlane className="w-5 h-5" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex justify-center items-center text-gray-400">{t('selectConversation')}</div>
        )}
      </div>
    </div>
  );
}

