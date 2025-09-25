"use client";

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const DEFAULT_LANG = 'es';
const LanguageContext = createContext({ lang: DEFAULT_LANG, setLang: () => {}, t: (k) => k });

const STRINGS = {
  es: {
    subscribe: 'Suscribirse',
    subscribed: 'Suscrito',
    addToFavorites: 'Agregar a favoritos',
    removeFromFavorites: 'Quitar de favoritos',
    manage: 'Gestionar',
    cancelSubscription: 'Cancelar suscripción',
    choosePlan: 'Elige un plan',
    subscriptionVsPpv: 'Suscripción: acceso global mientras esté activa. PPV: pagas por publicación.',
    loading: 'Cargando...',
    cancel: 'Cancelar',
    message: 'Mensaje',
    editProfile: 'Editar Perfil',
    // Sidebar / navegación
    home: 'Inicio',
    explore: 'Explorar',
    notifications: 'Notificaciones',
    messages: 'Mensajes',
    favorites: 'Favoritos',
    subscriptions: 'Suscripciones',
    addCard: 'Añadir tarjeta',
    myPurchases: 'Mis compras',
    earnings: 'Ganancias',
    dashboard: 'Panel',
    myProfile: 'Mi perfil',
    startCreatingTitle: 'Empieza a crear',
    startCreatingBody: 'Publica tu primer post o configura tu monetización.',
    createPostCTA: 'Crear post',
    monetizeCTA: 'Monetizar',
    signOut: 'Cerrar sesión',
    openMenu: 'Abrir menú',
    closeMenu: 'Cerrar menú',
    switchToEnglish: 'Cambiar a inglés',
    switchToSpanish: 'Cambiar a español',
    // Pages: subscriptions
    subscriptionsTitle: 'Suscripciones',
    subscriptionsLoading: 'Cargando suscripciones...',
    subscriptionsEmpty: 'No estás suscrito a ningún creador aún.',
    subscribedSince: 'Suscrito desde',
    // Pages: purchases
    purchasesTitle: 'Mis compras',
    purchasesLoading: 'Cargando...',
    purchasesEmpty: 'Aún no has comprado contenido PPV.',
    purchasesAccessNote: 'El acceso a los posts comprados se valida automáticamente al ver el contenido.',
    // Pages: favorites
    favoritesTitle: 'Favoritos',
    favoritesLoading: 'Cargando favoritos...',
    favoritesEmpty: 'Aún no tienes creadores en favoritos.',
    viewProfile: 'Ver perfil',
    remove: 'Quitar',
    // Pages: explore
    exploreCreatorsTitle: 'Explorar creadores',
    loadingGeneric: 'Cargando...',
    lastPostAgo: 'Última publicación',
    // Pages: earnings
    earningsPpvTitle: 'Ganancias PPV',
    gross: 'Bruto',
    platformFee: 'Comisión plataforma',
    creatorNet: 'Neto creador',
    transactions: 'Transacciones',
    // Home
    homeTitle: 'Inicio',
    suggestions: 'Sugerencias',
    or: 'o',
    searchCreatorPlaceholder: 'Encontrar un creador',
    searching: 'Buscando...',
    welcomeTo: 'Bienvenido a:',
    loginCta: 'Iniciar Sesión',
    homeHeroTitle: 'Descubre a creadores increíbles',
    homeHeroSubtitle: 'Conecta con artistas y recibe contenido exclusivo en cualquier momento.',
    homeHeroNote: 'Explora avances de publicaciones públicas, descubre nuevos creadores y activa notificaciones personalizadas cuando te unas.',
    homeFeedTitle: 'Inicio',
    homeFeedSubtitle: 'Descubre contenido de tus creadores favoritos y encuentra nuevas recomendaciones.',
    suggestedCreators: 'Creadores sugeridos',
    noSuggestionsYet: 'Sin sugerencias por ahora.',
    publicHighlightsTitle: 'Últimas publicaciones destacadas',
    publicHighlightsEmpty: 'Aún no hay publicaciones.',
    exclusiveContentLabel: 'Contenido exclusivo',
    publicSuggestionsTitle: 'Nuevos creadores',
    creatorPlaceholder: 'Creador',
    userHandlePlaceholder: '@usuario',
    commentsTagHint: 'Comentarios permiten etiquetar con @usuario',
    lightMode: 'Modo claro',
    darkMode: 'Modo oscuro',
    switchTheme: 'Cambiar tema',
    // Add Card
    addCardTitleFull: 'Añadir tarjeta',
    addCardDesc: 'Gestiona tus métodos de pago de forma segura en el portal de Stripe.',
    openPaymentPortal: 'Abrir portal de pago',
    opening: 'Abriendo...',
    // Billing
    billingTitle: 'Facturación',
    billingDesc: 'Gestiona tus métodos de pago y abre el portal de Stripe para añadir/eliminar tarjetas.',
    openStripePortal: 'Abrir portal de Stripe',
    loadingMethods: 'Cargando métodos...',
    noCards: 'No hay tarjetas asociadas.',
    saving: 'Guardando...',
    saveDefault: 'Guardar como predeterminado',
    // Notifications
    notificationsTitleFull: 'Notificaciones',
    notificationsEmpty: 'Aún no tienes notificaciones.',
    notificationsHint: '¿Esperabas ver algo aquí? Vuelve a',
    // Messages
    messagesTitleFull: 'Mensajes',
    loadingMessages: 'Cargando mensajes...',
    mustLoginForMessages: 'Debes iniciar sesión para ver tus mensajes.',
    noMessages: 'No hay mensajes',
    noConversations: 'No tienes conversaciones.',
    writeMessagePlaceholder: 'Escribe un mensaje...',
    selectConversation: 'Selecciona una conversación para empezar a chatear.',
    // Payments
    paymentSuccessTitle: 'Pago completado',
    paymentSuccessBody: 'Tu pago fue procesado correctamente.',
    back: 'Volver',
    paymentCancelTitle: 'Pago cancelado',
    paymentCancelBody: 'El pago fue cancelado o falló. Puedes intentarlo nuevamente.',
    // Monetization
    monetizationTitle: 'Monetización',
    monetizationDesc: 'Configura tus suscripciones y descuentos introductorios (solo primera compra).',
    currentPrice: 'Precio actual (Stripe price)',
    monthlyPrice: 'Precio mensual',
    currencyLabel: 'Moneda',
    save: 'Guardar',
    saved: 'Actualizado',
    plansTitle: 'Planes',
    plansHelp: 'Ingresa montos (vacío = no crear/actualizar). Descuento introductorio se aplica solo a la primera factura.',
    weekly: 'Semanal',
    monthly: 'Mensual',
    quarterly: 'Trimestral (3 meses)',
    semiannual: 'Semestral (6 meses)',
    annual: 'Anual',
    amount: 'Monto',
    introDiscountOnce: 'Descuento 1ª compra (%)',
    createCouponHelp: 'Crea price y cupón (una vez) si defines monto y % > 0.',
    savePlans: 'Guardar planes',
    statusUpdated: 'Estado actualizado',
    statusCheckError: 'No se pudo actualizar el estado',
    lastCheckedAt: 'Última verificación',
    // Creator Dashboard
    creatorDashboardTitle: 'Panel del creador',
    range: 'Rango',
    days7: '7 días',
    days30: '30 días',
    days90: '90 días',
    viewEarnings: 'Ver ganancias',
    activeSubscribers: 'Suscriptores activos',
    netIncome: 'Ingresos netos',
    topPpvPosts: 'Top posts por compras PPV',
    purchasesLabel: 'compras',
    noPpvPurchasesYet: 'Aún no tienes compras PPV.',
    topViewedPosts: 'Top posts por vistas',
    viewsLabel: 'vistas',
    noViewsYet: 'Aún no hay vistas registradas.',
    loadingDashboard: 'Cargando panel...',
  },
  en: {
    subscribe: 'Subscribe',
    subscribed: 'Subscribed',
    addToFavorites: 'Add to favorites',
    removeFromFavorites: 'Remove from favorites',
    manage: 'Manage',
    cancelSubscription: 'Cancel subscription',
    choosePlan: 'Choose a plan',
    subscriptionVsPpv: 'Subscription: global access while active. PPV: pay per post.',
    loading: 'Loading...',
    cancel: 'Cancel',
    message: 'Message',
    editProfile: 'Edit Profile',
    // Sidebar / navigation
    home: 'Home',
    explore: 'Explore',
    notifications: 'Notifications',
    messages: 'Messages',
    favorites: 'Favorites',
    subscriptions: 'Subscriptions',
    addCard: 'Add card',
    myPurchases: 'My purchases',
    earnings: 'Earnings',
    dashboard: 'Dashboard',
    myProfile: 'My profile',
    startCreatingTitle: 'Start creating',
    startCreatingBody: 'Publish your first post or set up monetization.',
    createPostCTA: 'Create post',
    monetizeCTA: 'Monetize',
    signOut: 'Sign out',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    switchToEnglish: 'Switch to English',
    switchToSpanish: 'Switch to Spanish',
    // Pages: subscriptions
    subscriptionsTitle: 'Subscriptions',
    subscriptionsLoading: 'Loading subscriptions...',
    subscriptionsEmpty: "You're not subscribed to any creator yet.",
    subscribedSince: 'Subscribed since',
    // Pages: purchases
    purchasesTitle: 'My purchases',
    purchasesLoading: 'Loading...',
    purchasesEmpty: "You haven't purchased PPV content yet.",
    purchasesAccessNote: 'Access to purchased posts is validated automatically when viewing the content.',
    // Pages: favorites
    favoritesTitle: 'Favorites',
    favoritesLoading: 'Loading favorites...',
    favoritesEmpty: "You don't have favorite creators yet.",
    viewProfile: 'View profile',
    remove: 'Remove',
    // Pages: explore
    exploreCreatorsTitle: 'Explore creators',
    loadingGeneric: 'Loading...',
    lastPostAgo: 'Last post',
    // Pages: earnings
    earningsPpvTitle: 'PPV Earnings',
    gross: 'Gross',
    platformFee: 'Platform fee',
    creatorNet: 'Creator net',
    transactions: 'Transactions',
    // Home
    homeTitle: 'Home',
    suggestions: 'Suggestions',
    or: 'or',
    searchCreatorPlaceholder: 'Find a creator',
    searching: 'Searching...',
    welcomeTo: 'Welcome to:',
    loginCta: 'Log in',
    homeHeroTitle: 'Discover amazing creators',
    homeHeroSubtitle: 'Connect with your favorite artists and unlock exclusive content, anytime.',
    homeHeroNote: 'Preview public highlights, discover new creators, and turn on tailored alerts once you join.',
    homeFeedTitle: 'Home',
    homeFeedSubtitle: 'Catch up with the creators you follow and discover new favorites.',
    suggestedCreators: 'Suggested creators',
    noSuggestionsYet: 'No suggestions yet.',
    publicHighlightsTitle: 'Latest public highlights',
    publicHighlightsEmpty: 'No public posts yet.',
    exclusiveContentLabel: 'Exclusive content',
    publicSuggestionsTitle: 'New creators',
    creatorPlaceholder: 'Creator',
    userHandlePlaceholder: '@user',
    commentsTagHint: 'Comments support tagging with @username',
    lightMode: 'Light mode',
    darkMode: 'Dark mode',
    switchTheme: 'Toggle theme',
    // Add Card
    addCardTitleFull: 'Add card',
    addCardDesc: 'Manage your payment methods securely in Stripe portal.',
    openPaymentPortal: 'Open payment portal',
    opening: 'Opening...',
    // Billing
    billingTitle: 'Billing',
    billingDesc: 'Manage your payment methods and open Stripe portal to add/remove cards.',
    openStripePortal: 'Open Stripe portal',
    loadingMethods: 'Loading methods...',
    noCards: 'No cards on file.',
    saving: 'Saving...',
    saveDefault: 'Save as default',
    // Notifications
    notificationsTitleFull: 'Notifications',
    notificationsEmpty: 'You have no notifications yet.',
    notificationsHint: 'Expected to see something here? Go back to',
    // Messages
    messagesTitleFull: 'Messages',
    loadingMessages: 'Loading messages...',
    mustLoginForMessages: 'You must log in to view your messages.',
    noMessages: 'No messages',
    noConversations: 'You have no conversations.',
    writeMessagePlaceholder: 'Write a message...',
    selectConversation: 'Select a conversation to start chatting.',
    // Payments
    paymentSuccessTitle: 'Payment completed',
    paymentSuccessBody: 'Your payment was processed successfully.',
    back: 'Back',
    paymentCancelTitle: 'Payment canceled',
    paymentCancelBody: 'Payment was canceled or failed. You can try again.',
    // Monetization
    monetizationTitle: 'Monetization',
    monetizationDesc: 'Set your subscriptions and introductory discounts (first invoice only).',
    currentPrice: 'Current price (Stripe price)',
    monthlyPrice: 'Monthly price',
    currencyLabel: 'Currency',
    save: 'Save',
    saved: 'Updated',
    plansTitle: 'Plans',
    plansHelp: 'Enter amounts (empty = skip). Introductory discount applies to first invoice only.',
    weekly: 'Weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly (3 months)',
    semiannual: 'Semiannual (6 months)',
    annual: 'Annual',
    amount: 'Amount',
    introDiscountOnce: 'Intro discount (%)',
    createCouponHelp: 'Creates price and coupon (once) when amount and % > 0.',
    savePlans: 'Save plans',
    statusUpdated: 'Status updated',
    statusCheckError: 'Unable to refresh status',
    lastCheckedAt: 'Last checked',
    // Creator Dashboard
    creatorDashboardTitle: 'Creator dashboard',
    range: 'Range',
    days7: '7 days',
    days30: '30 days',
    days90: '90 days',
    viewEarnings: 'View earnings',
    activeSubscribers: 'Active subscribers',
    netIncome: 'Net income',
    topPpvPosts: 'Top posts by PPV purchases',
    purchasesLabel: 'purchases',
    noPpvPurchasesYet: 'No PPV purchases yet.',
    topViewedPosts: 'Top posts by views',
    viewsLabel: 'views',
    noViewsYet: 'No views recorded yet.',
    loadingDashboard: 'Loading dashboard...',
  },
};

// Extensiones de i18n para Auth sin tocar el bloque grande (evita problemas de codificación)
try {
  Object.assign(STRINGS.es, {
    loginTitle: 'Inicia sesión en tu cuenta',
    loggingIn: 'Iniciando sesión...',
    invalidCredentials: 'Credenciales inválidas. Inténtalo de nuevo.',
    loginSuccessRedirect: 'Inicio de sesión exitoso. Redireccionando...',
    connectionError: 'Error de conexión. Revisa tu red.',
    noAccountQuestion: '¿No tienes una cuenta?',
    signupHere: 'Regístrate aquí',
    signupTitle: 'Crea tu cuenta gratis',
    signupHeroBody: 'Publica contenido exclusivo, gestiona suscripciones y conecta con tu comunidad.',
    username: 'Nombre de usuario',
    email: 'Correo electrónico',
    password: 'Contraseña',
    profilePhoto: 'Foto de perfil',
    coverPhoto: 'Foto de portada',
    uploadProfilePhoto: 'Subir foto de perfil',
    uploadCoverPhoto: 'Subir foto de portada',
    registering: 'Registrando...',
    signupCta: 'Registrarse',
    signupSuccess: '¡Registro exitoso! Ahora puedes iniciar sesión.',
    signupError: 'Error en el registro. Inténtalo de nuevo.',
    haveAccountQuestion: '¿Ya tienes una cuenta?',
    loginHere: 'Inicia sesión aquí',
  });
  Object.assign(STRINGS.en, {
    loginTitle: 'Sign in to your account',
    loggingIn: 'Signing in...',
    invalidCredentials: 'Invalid credentials. Try again.',
    loginSuccessRedirect: 'Signed in successfully. Redirecting...',
    connectionError: 'Connection error. Check your network.',
    noAccountQuestion: "Don't have an account?",
    signupHere: 'Sign up here',
    signupTitle: 'Create your account',
    signupHeroBody: 'Publish exclusive content, manage subscriptions, and engage your community.',
    username: 'Username',
    email: 'Email',
    password: 'Password',
    profilePhoto: 'Profile photo',
    coverPhoto: 'Cover photo',
    uploadProfilePhoto: 'Upload profile photo',
    uploadCoverPhoto: 'Upload cover photo',
    registering: 'Registering...',
    signupCta: 'Sign up',
    signupSuccess: 'Sign up successful! You can now log in.',
    signupError: 'Sign up error. Please try again.',
    haveAccountQuestion: 'Already have an account?',
    loginHere: 'Log in here',
  });
} catch {}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(DEFAULT_LANG);

  useEffect(() => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('lang') : null;
      if (stored === 'en' || stored === 'es') setLang(stored);
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem('lang', lang); } catch {}
    try { document.documentElement.lang = lang; } catch {
Object.assign(STRINGS.es, { postsLoadError:  'No se pudieron cargar las publicaciones.', mustLoginToLike: 'Debes iniciar sesión para dar me gusta.', likeErrorTryAgain: 'Error al dar me gusta. Inténtalo de nuevo.', loadingPosts: 'Cargando publicaciones...', noPostsYet: 'Sin publicaciones agregadas aún' }); 
Object.assign(STRINGS.en, { postsLoadError:  'Could not load posts.', mustLoginToLike: 'You must log in to like.', likeErrorTryAgain: 'Error liking. Please try again.', loadingPosts: 'Loading posts...', noPostsYet: 'No posts yet' }); 
}
  }, [lang]);

  const t = useMemo(() => {
    const dict = STRINGS[lang] || STRINGS[DEFAULT_LANG];
    return (key) => dict[key] || STRINGS[DEFAULT_LANG][key] || key;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
// Extra keys for modal labels
try {
  Object.assign(STRINGS.es, { deleting: 'Eliminando...', confirm: 'Confirmar' });
  Object.assign(STRINGS.en, { deleting: 'Deleting...', confirm: 'Confirm' });
} catch {}


Object.assign(STRINGS.es, { loadingProfile:  'Cargando perfil...', defaultBio: 'Aquí va la biografía del usuario. Es un espacio para que el creador se presente y cuente algo sobre su contenido.', shareNotSupported: 'Tu navegador no soporta la función de compartir.', confirmDeletePost: '¿Estás seguro de que quieres borrar esta publicación? ', deletePostError: 'Error al borrar la publicación.', editProfile: 'Editar Perfil', share: 'Compartir', posts: 'Publicaciones', publishedOn: 'Publicado el', delete: 'Borrar', noOwnPostsYet: 'Aún no tienes publicaciones.' }); 
Object.assign(STRINGS.en, { loadingProfile:  'Loading profile...', defaultBio: 'User bio goes here. A space for creators to describe their content.', shareNotSupported: 'Your browser does not support sharing.', confirmDeletePost: 'Are you sure you want to delete this post?', deletePostError: 'Failed to delete the post.', editProfile: 'Edit Profile', share: 'Share', posts: 'Posts', publishedOn: 'Published on', delete: 'Delete', noOwnPostsYet: 'You have no posts yet.' }); 


Object.assign(STRINGS.es, { postLoadError:  'No se pudo cargar el post', previous: 'Anterior', next: 'Siguiente', lockedContent: 'Contenido bloqueado', buyPpv: 'Comprar PPV', tipAmountPrompt: 'Monto de propina (USD, ej: 5.00):', invalidAmount: 'Monto inválido', addedToFavorites: 'Creador agregado a favoritos', checkoutStartError: 'No se pudo iniciar el checkout', paymentStartError: 'No se pudo iniciar el pago' }); 
Object.assign(STRINGS.es, { removedFromFavorites: 'Creador quitado de favoritos' });
Object.assign(STRINGS.en, { removedFromFavorites: 'Creator removed from favorites' });
Object.assign(STRINGS.en, { postLoadError:  'Failed to load post', previous: 'Previous', next: 'Next', lockedContent: 'Locked content', buyPpv: 'Buy PPV', tipAmountPrompt: 'Tip amount (USD, e.g., 5.00):', invalidAmount: 'Invalid amount', addedToFavorites: 'Creator added to favorites', checkoutStartError: 'Could not start checkout', paymentStartError: 'Could not start payment' }); 


Object.assign(STRINGS.es, { mustLoginToSubscribe:  'Debes iniciar sesión para suscribirte.', creatorNoPrice: 'Este creador aún no tiene precio configurado.', monetizationLabel: 'Monetización', modePublic: 'Público', modeExclusive: 'Exclusivo (suscriptores)', modeExclusivePpv: 'Exclusivo (suscriptores o PPV)', ppvPrice: 'Precio PPV', ppvCurrency: 'Moneda', ppvInvalidPrice: 'Precio PPV inválido', monetizationUpdated: 'Monetización actualizada', mediaUpdated: 'Media actualizada', mediaRemoved: 'Media eliminada', postUpdated: 'Publicación actualizada', postDeleted: 'Publicación eliminada', userNotFound: 'Usuario no encontrado', edit: 'Editar', changeMedia: 'Cambiar imagen/video', removeMedia: 'Quitar media', editMonetization: 'Editar monetización' }); 
Object.assign(STRINGS.en, { mustLoginToSubscribe:  'You must log in to subscribe.', creatorNoPrice: 'This creator has no price configured yet.', monetizationLabel: 'Monetization', modePublic: 'Public', modeExclusive: 'Exclusive (subscribers)', modeExclusivePpv: 'Exclusive (subscribers or PPV)', ppvPrice: 'PPV price', ppvCurrency: 'Currency', ppvInvalidPrice: 'Invalid PPV price', monetizationUpdated: 'Monetization updated', mediaUpdated: 'Media updated', mediaRemoved: 'Media removed', postUpdated: 'Post updated', postDeleted: 'Post deleted', userNotFound: 'User not found', edit: 'Edit', changeMedia: 'Change image/video', removeMedia: 'Remove media', editMonetization: 'Edit monetization' }); 


Object.assign(STRINGS.es, { accountType: 'Tipo de cuenta', consumer:'Consumidor', creator:'Creador', becomeCreator:'Conviértete en creador', becomeCreatorTitle:'¿Quieres monetizar tu contenido?', becomeCreatorBody:'Cambia tu cuenta a creador y comienza a publicar.', becomeCreatorError:'No se pudo cambiar el rol. Inténtalo nuevamente.' }); 
Object.assign(STRINGS.en, { accountType: 'Account type', consumer:'Consumer', creator:'Creator', becomeCreator:'Become a creator', becomeCreatorTitle:'Want to monetize your content?', becomeCreatorBody:'Switch your account to creator and start posting.', becomeCreatorError:'Could not change role. Please try again.' }); 

Object.assign(STRINGS.es, { roleLabel: 'Tipo de cuenta', roleConsumer: 'Soy fan (solo ver contenido)', roleCreator: 'Soy creador/a (publicar contenido)' });
Object.assign(STRINGS.en, { roleLabel: 'Account type', roleConsumer: 'Fan (view content only)', roleCreator: 'Creator (publish content)' });


Object.assign(STRINGS.es, { deleteAccount: 'Eliminar cuenta', deleteAccountDesc:'Esta acción es permanente y eliminará tu perfil, publicaciones, mensajes y suscripciones.', confirmDeleteAccountPrompt:'Escribe ELIMINAR para confirmar', accountDeleted:'Cuenta eliminada', deleteAccountError:'No se pudo eliminar la cuenta' }); 
Object.assign(STRINGS.en, { deleteAccount: 'Delete account', deleteAccountDesc:'This is permanent and will remove your profile, posts, messages and subscriptions.', confirmDeleteAccountPrompt:'Type DELETE to confirm', accountDeleted:'Account deleted', deleteAccountError:'Could not delete the account' }); 


Object.assign(STRINGS.es, { settings: 'Ajustes', enterPasswordToConfirm:'Ingresa tu contraseña para confirmar' }); 
Object.assign(STRINGS.en, { settings: 'Settings', enterPasswordToConfirm:'Enter your password to confirm' }); 

