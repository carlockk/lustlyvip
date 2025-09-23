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
      return NextResponse.json({ message: 'No hay cuenta conectada' }, { status: 400 });
    }

    const stripe = getStripe();
    const link = await stripe.accounts.createLoginLink(user.stripeConnectId);
    return NextResponse.json({ url: link.url });
  } catch (e) {
    console.error('connect login-link error', e);
    return NextResponse.json({ message: 'Error creando login link' }, { status: 500 });
  }
}
