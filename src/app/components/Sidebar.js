// src/app/components/Sidebar.js
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  MdHome,
  MdNotifications,
  MdMail,
  MdPeople,
  MdCreditCard,
  MdPerson,
  MdLogout,
  MdMenu,
  MdClose,
  MdFavorite,
  MdExpandMore,        // 👈 reemplaza MdChevronDown
  MdShoppingBag,
  MdAttachMoney,
  MdTrendingUp,
  MdDashboard,
} from 'react-icons/md';

import ThemeToggle from './ThemeToggle';
import LanguageToggle from './LanguageToggle';
import { useLanguage } from '@/lib/i18n';

const MAIN_ITEMS = [
  { key: 'home', icon: MdHome, href: '/' },
  { key: 'explore', icon: MdPeople, href: '/explore' },
  { key: 'notifications', icon: MdNotifications, href: '/notifications' },
  { key: 'messages', icon: MdMail, href: '/messages' },
  { key: 'favorites', icon: MdFavorite, href: '/favorites' },
  { key: 'subscriptions', icon: MdPeople, href: '/subscriptions' },
  { key: 'addCard', icon: MdCreditCard, href: '/add-card' },
];

export default function Sidebar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const { t } = useLanguage();

  const [open, setOpen] = useState(false);       // drawer mobile
  const [isCreator, setIsCreator] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false); // acordeón

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!session) { if (active) setIsCreator(false); return; }
        const res = await fetch('/api/me/flags');
        const j = await res.json();
        if (active) setIsCreator(!!j.isCreator);
      } catch {
        if (active) setIsCreator(false);
      }
    })();
    return () => { active = false; };
  }, [session]);

  const PANEL_ROUTES = useMemo(() => ([
    { href: '/purchases',          label: t('myPurchases') || 'Mis compras',        Icon: MdShoppingBag },
    { href: '/monetization',       label: t('monetizationLabel') || 'Monetización', Icon: MdAttachMoney },
    { href: '/earnings',           label: t('earnings') || 'Ganancias',             Icon: MdTrendingUp },
    { href: '/creator/dashboard',  label: t('dashboard') || 'Panel del creador',    Icon: MdDashboard },
  ]), [t]);

  const isActive = (href) =>
    pathname === href || (href !== '/' && pathname?.startsWith(href + '/'));

  useEffect(() => {
    if (PANEL_ROUTES.some(r => isActive(r.href))) setPanelOpen(true);
  }, [pathname, PANEL_ROUTES]);

  const NavLinks = () => (
    <nav className="flex flex-col w-full space-y-1">
      {MAIN_ITEMS.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          onClick={() => setOpen(false)}
          className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-colors cursor-pointer ${
            isActive(item.href) ? 'bg-pink-600 text-white' : 'hover:bg-gray-700 text-gray-200'
          }`}
        >
          <item.icon className="text-2xl" />
          <span className="font-medium">{t(item.key)}</span>
        </Link>
      ))}

      {session && !isCreator && (
        <div className="mt-2 p-3 rounded-lg border border-gray-700 bg-gray-800">
          <div className="text-sm text-gray-200 font-semibold mb-1">
            {t('becomeCreatorTitle') || '¿Quieres monetizar tu contenido?'}
          </div>
          <p className="text-xs text-gray-400 mb-2">
            {t('becomeCreatorBody') || 'Cambia tu cuenta a creador y comienza a publicar.'}
          </p>
          <button
            onClick={async () => {
              try {
                const r = await fetch('/api/me/role', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ role: 'creator' }),
                });
                if (!r.ok) throw new Error('');
                setOpen(false);
                window.location.href = '/monetization';
              } catch {
                alert(t('becomeCreatorError') || 'No se pudo activar el modo creador');
              }
            }}
            className="px-3 py-1 rounded bg-pink-600 hover:bg-pink-700 text-xs cursor-pointer"
          >
            {t('becomeCreator') || 'Conviértete en creador'}
          </button>
        </div>
      )}

      {session && isCreator && (
        <>
          <button
            type="button"
            onClick={() => setPanelOpen(v => !v)}
            className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-colors ${
              panelOpen || PANEL_ROUTES.some(r => isActive(r.href))
                ? 'bg-gray-700 text-white'
                : 'hover:bg-gray-700 text-gray-200'
            }`}
            aria-expanded={panelOpen}
            aria-controls="creator-panel-submenu"
          >
            <span className="font-medium flex items-center gap-3">
              <MdDashboard className="text-2xl" />
              {t('creatorPanel') || 'Panel del creador'}
            </span>
            <MdExpandMore
              className={`text-xl transition-transform ${panelOpen ? 'rotate-180' : ''}`}
            />
          </button>

          <div
            id="creator-panel-submenu"
            className={`overflow-hidden transition-[max-height] duration-300 ease-in-out ${
              panelOpen ? 'max-h-96' : 'max-h-0'
            }`}
          >
            <div className="mt-1 ml-2 pl-2 border-l border-gray-700 space-y-1">
              {PANEL_ROUTES.map(({ href, label, Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive(href)
                      ? 'bg-pink-600 text-white'
                      : 'hover:bg-gray-700 text-gray-200'
                  }`}
                >
                  <Icon className="text-lg" />
                  <span className="font-medium">{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}

      {session && (
        <Link
          href={`/profile/${session.user.id}`}
          onClick={() => setOpen(false)}
          className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-colors ${
            isActive(`/profile/${session.user.id}`)
              ? 'bg-pink-600 text-white'
              : 'hover:bg-gray-700 text-gray-200'
          }`}
        >
          <MdPerson className="text-2xl" />
          <span className="font-medium">{t('myProfile')}</span>
        </Link>
      )}
    </nav>
  );

  const ProfileSection = () =>
    session ? (
      <div className="mt-auto pt-4 border-t border-gray-700">
        <Link
          href={`/profile/${session.user.id}`}
          className="flex items-center gap-3 hover:bg-gray-700 p-2 rounded-lg transition-colors cursor-pointer"
          onClick={() => setOpen(false)}
        >
          <img
            src={session.user.image || '/images/placeholder-avatar.png'}
            alt="Profile"
            className="w-10 h-10 rounded-full object-cover"
          />
          <div className="flex flex-col text-sm">
            <span className="font-semibold text-gray-100">{session.user.name}</span>
            {session.user.username && (
              <span className="text-gray-400">@{session.user.username}</span>
            )}
          </div>
        </Link>

        <button
          onClick={() => signOut({ callbackUrl: '/auth/login' })}
          className="flex items-center w-full gap-3 py-2 px-3 mt-2 rounded-lg transition-colors hover:bg-gray-700 text-sm text-red-400 hover:text-red-500 cursor-pointer"
        >
          <MdLogout className="text-2xl" />
          <span className="font-medium">{t('signOut')}</span>
        </button>
      </div>
    ) : null;

  if (status === 'loading') return null;
  if (!session) return null;

  return (
    <>
      {/* Top bar móvil */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-gray-900/80 backdrop-blur border-b border-gray-800 h-12 flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <img src="/images/logo.png" alt="Lustly Logo" className="h-7 app-logo" />
        </Link>
        <button
          onClick={() => setOpen(true)}
          aria-label={t('openMenu')}
          title={t('openMenu')}
          className="text-gray-200 hover:text-white cursor-pointer"
        >
          <MdMenu className="text-2xl" />
        </button>
      </div>

      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-gray-800 text-gray-100 p-4 border-r border-gray-700 fixed top-0 left-0 h-full z-30 overflow-y-auto">
        <div className="flex-1 flex flex-col items-start space-y-2">
          <div className="w-full flex justify-center mb-8">
            <Link href="/">
              <img src="/images/logo.png" alt="Lustly Logo" className="h-10 app-logo" />
            </Link>
          </div>

          <NavLinks />

          <div className="w-full mt-4 flex items-center gap-2">
            <ThemeToggle compact />
            <LanguageToggle compact />
          </div>
        </div>

        <ProfileSection />
      </aside>

      {/* Drawer móvil */}
      <div className={`md:hidden fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`}>
        <div
          className={`absolute inset-0 bg-black/50 transition-opacity ${
            open ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setOpen(false)}
        />
        <div
          className={`absolute top-0 right-0 h-full w-72 bg-gray-800 text-gray-100 p-4 border-l border-gray-700 transform transition-transform duration-300 overflow-y-auto ${
            open ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between mb-6">
            <Link href="/">
              <img src="/images/logo.png" alt="Lustly Logo" className="h-8 app-logo" />
            </Link>
            <button
              onClick={() => setOpen(false)}
              aria-label={t('closeMenu')}
              title={t('closeMenu')}
              className="text-gray-200 hover:text-white cursor-pointer"
            >
              <MdClose className="text-2xl" />
            </button>
          </div>

          <div className="flex flex-col h-[calc(100%-2rem)]">
            <div className="flex-1">
              <NavLinks />
            </div>

            <div className="mb-3 flex items-center gap-2">
              <ThemeToggle compact />
              <LanguageToggle compact />
            </div>

            <ProfileSection />
          </div>
        </div>
      </div>
    </>
  );
}
