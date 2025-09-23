// src/app/api/stripe/connect/status/route.js
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import { getStripe } from '@/lib/stripe';

/**
 * GET
 * Lee el estado guardado en tu base de datos (rápido, sin ir a Stripe).
 * Útil para pintar la UI sin golpear la API de Stripe cada vez.
 * Respuesta:
 * { connected: boolean, chargesEnabled: boolean, accountId: string|null }
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
    }

    await dbConnect();

    // Asegúrate de tener estos campos en tu esquema User:
    // stripeConnectId: String
    // stripeConnectChargesEnabled: Boolean (opcional)
    const user = await User.findById(session.user.id)
      .select('stripeConnectId stripeConnectChargesEnabled')
      .lean();

    const connected = !!user?.stripeConnectId;
    const chargesEnabled = !!user?.stripeConnectChargesEnabled;

    return NextResponse.json({
      connected,
      chargesEnabled,
      accountId: connected ? user.stripeConnectId : null,
    });
  } catch (e) {
    console.error('connect status GET error', e);
    return NextResponse.json({ message: 'Error consultando estado' }, { status: 500 });
  }
}

/**
 * POST
 * Consulta el estado en Stripe (accounts.retrieve) y actualiza tu DB.
 * Úsalo cuando el usuario pulse “check status” o tras completar onboarding.
 * Respuesta:
 * { connected: boolean, chargesEnabled: boolean, accountId: string|null }
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findById(session.user.id)
      .select('stripeConnectId stripeConnectChargesEnabled')
      .exec();

    if (!user?.stripeConnectId) {
      return NextResponse.json({
        connected: false,
        chargesEnabled: false,
        accountId: null,
      });
    }

    const stripe = getStripe();
    const acct = await stripe.accounts.retrieve(user.stripeConnectId);

    const chargesEnabled = !!acct?.charges_enabled;

    // Guarda un “cache” del estado para lecturas rápidas vía GET
    user.stripeConnectChargesEnabled = chargesEnabled;
    await user.save();

    return NextResponse.json({
      connected: true,
      chargesEnabled,
      accountId: user.stripeConnectId,
    });
  } catch (e) {
    console.error('connect status POST error', e?.raw || e);
    // si viene error de Stripe, intenta exponer mensaje
    const msg = e?.raw?.message || e?.message || 'Error consultando estado';
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
