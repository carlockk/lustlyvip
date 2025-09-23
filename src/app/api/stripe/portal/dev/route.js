// src/app/api/stripe/portal/dev/route.js

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ensureStripeCustomer, getStripe, appBaseUrl } from '@/lib/stripe';

// Endpoint solo para desarrollo: devuelve detalles del error para depuración
export async function POST() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });

    const customerId = await ensureStripeCustomer(session.user.id);
    const stripe = getStripe();

    const returnUrl = `${appBaseUrl()}/subscriptions`;
    const configId = process.env.STRIPE_PORTAL_CONFIGURATION_ID || undefined;
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
      ...(configId ? { configuration: configId } : {}),
    });

    return NextResponse.json({ url: portal.url });
  } catch (err) {
    const details = {
      message: err?.message || 'Error creando sesión de portal',
      stripeMessage: err?.raw?.message || null,
      type: err?.type || null,
      code: err?.code || null,
      statusCode: err?.statusCode || null,
    };
    console.error('Portal DEV error:', details, err);
    const combined = `${details.message}${details.stripeMessage ? ' - ' + details.stripeMessage : ''}`;
    return NextResponse.json({ message: combined }, { status: 500 });
  }
}

