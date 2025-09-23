// src/app/api/stripe/checkout/subscription/route.js

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ensureStripeCustomer, getStripe } from '@/lib/stripe';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';

export async function POST(req) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });

    const { creatorId, priceId, coupon, autoCancelAtPeriodEnd = false, cancelAt = null } = await req.json();
    if (!creatorId || !priceId) {
      return NextResponse.json({ message: 'Faltan parámetros' }, { status: 400 });
    }

    // Validar que el priceId pertenezca al creador
    await dbConnect();
    const creator = await User.findById(creatorId).select('stripePriceId stripePrices');
    if (!creator) return NextResponse.json({ message: 'Creador no encontrado' }, { status: 404 });
    const allowed = new Set([
      creator.stripePriceId,
      creator?.stripePrices?.day_1,
      creator?.stripePrices?.week_1,
      creator?.stripePrices?.month_1,
      creator?.stripePrices?.month_3,
      creator?.stripePrices?.month_6,
      creator?.stripePrices?.year_1,
    ].filter(Boolean));
    if (!allowed.has(priceId)) {
      return NextResponse.json({ message: 'priceId no permitido para este creador' }, { status: 400 });
    }

    const stripe = getStripe();
    const customerId = await ensureStripeCustomer(session.user.id);

    const origin = new URL(req.url).origin;
    const success = `${origin}/payments/success?type=subscription&creatorId=${creatorId}&redirect=/profile/${creatorId}&session_id={CHECKOUT_SESSION_ID}`;
    const cancel = `${origin}/payments/cancel`;

    const platformFeePercent = Number(process.env.PLATFORM_FEE_PERCENT || '3');
    const creatorFull = await User.findById(creatorId).select('stripeConnectId stripeConnectChargesEnabled').lean();
    const useConnect = !!process.env.STRIPE_CONNECT_ENABLED && !!creatorFull?.stripeConnectId && creatorFull?.stripeConnectChargesEnabled !== false;

    const base = {
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      discounts: coupon ? [{ coupon }] : undefined,
      success_url: success,
      cancel_url: cancel,
      metadata: {
        type: 'subscription',
        creatorId,
        subscriberId: String(session.user.id),
        autoCancelAtPeriodEnd: autoCancelAtPeriodEnd ? '1' : '0',
        cancelAt: cancelAt ? String(cancelAt) : '',
      },
    };

    if (useConnect) {
      base.subscription_data = {
        application_fee_percent: platformFeePercent,
        transfer_data: { destination: creatorFull.stripeConnectId },
      };
    }

    const checkout = await stripe.checkout.sessions.create(base);

    return NextResponse.json({ url: checkout.url });
  } catch (err) {
    console.error('Error creando Checkout de suscripción:', err);
    return NextResponse.json({ message: 'Error creando checkout' }, { status: 500 });
  }
}
