// src/app/api/stripe/portal/route.js

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ensureStripeCustomer, getStripe, appBaseUrl } from '@/lib/stripe';

export async function POST() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });

    const customerId = await ensureStripeCustomer(session.user.id);
    const stripe = getStripe();

    const returnUrl = `${appBaseUrl()}/subscriptions`;
    const configId = process.env.STRIPE_PORTAL_CONFIGURATION_ID || undefined;
    const createOpts = {
      customer: customerId,
      return_url: returnUrl,
      ...(configId ? { configuration: configId } : {}),
    };

    const portal = await stripe.billingPortal.sessions.create(createOpts);
    return NextResponse.json({ url: portal.url });
  } catch (err) {
    const message = process.env.NODE_ENV === 'production'
      ? 'Error creando sesión de portal'
      : `Error creando sesión de portal: ${err?.message || 'desconocido'}`;
    console.error('Error creando sesión de portal:', err);
    return NextResponse.json({ message }, { status: 500 });
  }
}

