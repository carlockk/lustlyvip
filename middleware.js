// middleware.js
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// ───────────────────────────────────────────────────────────────────────────────
// 1) Rate limiter per-IP (simple, memoria). Para prod real: Redis/Upstash.
// ───────────────────────────────────────────────────────────────────────────────
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minuto
const RATE_LIMIT_MAX = 60;           // req por ventana
const buckets = new Map();           // key -> { count, start }

function getClientIp(req) {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0].trim();
  return req.headers.get('x-real-ip') || '127.0.0.1';
}

function shouldRateLimit(pathname) {
  if (!pathname.startsWith('/api/')) return false;
  // Bypass para Stripe webhook, NextAuth y explore público
  if (pathname.startsWith('/api/stripe/webhook')) return false;
  if (pathname.startsWith('/api/auth/')) return false;
  if (pathname.startsWith('/api/creators/explore')) return false;
  return true;
}

// ───────────────────────────────────────────────────────────────────────────────
// 2) Definición de rutas privadas
//    Invitados podrán ver: /explore y /profile/[id] (públicos).
// ───────────────────────────────────────────────────────────────────────────────
const PRIVATE_PREFIXES = [
  '/feed',
  '/notifications',
  '/messages',
  '/favorites',
  '/subscriptions',
  '/purchases',
  '/likes',
  '/add-card',
  '/creator',
  '/me',
  '/settings',
  '/posts',          // creación/edición de posts
  '/api/me',         // APIs de usuario
];

function isAuthPath(pathname) {
  return pathname.startsWith('/auth/') || pathname.startsWith('/api/auth/');
}

function isPublicProfilePath(pathname) {
  if (!pathname.startsWith('/profile')) return false;
  const parts = pathname.split('/').filter(Boolean); // ['profile', 'id?']
  return parts.length === 2; // exactamente /profile/:id
}

// ───────────────────────────────────────────────────────────────────────────────
// 3) Middleware
// ───────────────────────────────────────────────────────────────────────────────
export async function middleware(req) {
  const url = new URL(req.url);
  const { pathname, search } = url;

  // 3.0 Redirigir raíz a /explore (pública)
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/explore', req.url));
  }

  // 3.1 Rate limit para /api/* (con bypass definidos)
  if (shouldRateLimit(pathname)) {
    const now = Date.now();
    const ip = getClientIp(req);
    const key = `${ip}`;
    const bucket = buckets.get(key);
    if (!bucket || now - bucket.start > RATE_LIMIT_WINDOW_MS) {
      buckets.set(key, { count: 1, start: now });
    } else {
      bucket.count += 1;
      if (bucket.count > RATE_LIMIT_MAX) {
        return new NextResponse(JSON.stringify({ message: 'Too Many Requests' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
  }

  // 3.2 Gate de autenticación
  const isAuth = isAuthPath(pathname);
  const isProfilePublic = isPublicProfilePath(pathname);
  const isExplore = pathname.startsWith('/explore'); // público

  const isPrivate =
    !isAuth &&
    !isProfilePublic &&
    !isExplore &&
    (
      PRIVATE_PREFIXES.includes(pathname) ||
      PRIVATE_PREFIXES.some(p => p !== '/' && pathname.startsWith(p + '/'))
    );

  if (isPrivate) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      const callbackUrl = encodeURIComponent(pathname + (search || ''));
      return NextResponse.redirect(new URL(`/auth/login?callbackUrl=${callbackUrl}`, req.url));
    }
  }

  // 3.3 Continuar y añadir headers de seguridad
  const res = NextResponse.next();

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "img-src 'self' data: blob: https:",
    "media-src 'self' data: blob: https:",
    "connect-src 'self' https: http: ws:",
    "style-src 'self' 'unsafe-inline' https:",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
    "font-src 'self' https: data:",
  ].join('; ');

  res.headers.set('Content-Security-Policy', csp);
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', "camera=(), microphone=(), geolocation=()");
  res.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  res.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');

  return res;
}

// ───────────────────────────────────────────────────────────────────────────────
// 4) Matcher: aplica a todo excepto estáticos/imágenes/favicon
// ───────────────────────────────────────────────────────────────────────────────
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp4|webm)$).*)',
  ],
};
