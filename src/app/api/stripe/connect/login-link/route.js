// src/app/api/stripe/connect/login-link/route.js
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import { getStripe } from '@/lib/stripe';

export async function POST() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });

    await dbConnect();
    const user = await User.findById(session.user.id).select('stripeConnectId').lean();
    if (!user?.stripeConnectId) {
      return NextResponse.json({ message: 'No hay cuenta Stripe conectada' }, { status: 400 });
    }

    const stripe = getStripe();
    try {
      const link = await stripe.accounts.createLoginLink(user.stripeConnectId);
      return NextResponse.json({ url: link.url });
    } catch (err) {
      console.error('stripe login-link error', err?.raw || err);
      // Mensaje más explícito para debug:
      return NextResponse.json({
        message: err?.raw?.message || err?.message || 'Stripe rechazó el login link',
        code: err?.raw?.code || null,
      }, { status: 400 });
    }
  } catch (e) {
    console.error('connect login-link error', e);
    return NextResponse.json({ message: 'Error creando login link' }, { status: 500 });
  }
}
