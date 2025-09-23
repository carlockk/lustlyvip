// src/app/api/stripe/connect/onboard/route.js
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import { getStripe } from '@/lib/stripe';

export async function POST(req) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
    }

    const userId = session.user.id;

    await dbConnect();
    const user = await User.findById(userId).select('stripeConnectId email username').lean();

    const stripe = getStripe();

    // 1) Crear o reutilizar la cuenta de Connect (Express) con capabilities pedidas
    let accountId = user?.stripeConnectId;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        // Pide capabilities para que Onboarding habilite lo necesario
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true },
        },
        metadata: { appUserId: String(userId) },
        email: user?.email || undefined,
        business_type: 'individual',
      });

      accountId = account.id;
      await User.updateOne({ _id: userId }, { $set: { stripeConnectId: accountId } });
    }

    // 2) Link de onboarding (o actualización) de la cuenta
    const origin = new URL(req.url).origin;
    const returnUrl = `${origin}/monetization`; // más lógico para tu flujo que /profile
    const refreshUrl = `${origin}/monetization`;

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url, accountId });
  } catch (e) {
    console.error('connect onboard error:', e?.raw || e);
    return NextResponse.json({ message: e?.message || 'Error creando onboarding' }, { status: 500 });
  }
}
