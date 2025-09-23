import { NextResponse } from 'next/server';

// Simple in-memory rate limiter (per-IP, fixed window). For production, use Redis or similar.
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 60; // requests per window
const buckets = new Map(); // key -> { count, start }

function getClientIp(req) {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0].trim();
  return req.headers.get('x-real-ip') || '127.0.0.1';
}

function shouldRateLimit(pathname) {
  if (!pathname.startsWith('/api/')) return false;
  // Allow Stripe webhook to bypass limiter
  if (pathname.startsWith('/api/stripe/webhook')) return false;
  return true;
}

export function middleware(req) {
  const { pathname } = new URL(req.url);

  // Rate limiting for API routes (basic, per-IP)
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

  // Security headers on all responses
  const res = NextResponse.next();

  // Content Security Policy (relaxed for dev and Next.js)
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "img-src 'self' data: blob: https:",
    "media-src 'self' data: blob: https:",
    "connect-src 'self' https:",
    "style-src 'self' 'unsafe-inline' https:",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
    "font-src 'self' https: data:",
  ].join('; ');

  res.headers.set('Content-Security-Policy', csp);
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', "camera=(), microphone=(), geolocation=()" );
  res.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  res.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  // HSTS (only meaningful over HTTPS; safe to include always)
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');

  return res;
}

export const config = {
  matcher: [
    // Apply to all paths except next static/image assets and favicons
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};

