// src/app/api/stripe/connect/disconnect/route.js
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
    if (!user?.stripeConnectId) return NextResponse.json({ ok: true }); // nada que hacer

    // ⚠️ IMPORTANTE: cancela suscripciones activas de este creador antes de desconectar.
    // (Implementa tu propia lógica aquí si aplica)

    const stripe = getStripe();
    await stripe.accounts.del(user.stripeConnectId);

    await User.updateOne(
      { _id: session.user.id },
      { $unset: { stripeConnectId: 1 }, $set: { monetizationEnabled: false } }
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('connect disconnect error', e?.raw || e);
    return NextResponse.json({ message: e?.message || 'Error desconectando Stripe' }, { status: 500 });
  }
}
