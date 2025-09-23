// src/app/api/stripe/checkout/tip/route.js

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ensureStripeCustomer, getStripe, appBaseUrl } from '@/lib/stripe';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';

export async function POST(req) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });

    const { creatorId, amountCents, currency } = await req.json();
    if (!creatorId) return NextResponse.json({ message: 'Falta creatorId' }, { status: 400 });
    const amount = parseInt(amountCents, 10);
    if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ message: 'Monto inválido' }, { status: 400 });
    const cur = (currency || 'usd').toLowerCase();

    await dbConnect();
    const creator = await User.findById(creatorId).select('username').lean();
    if (!creator) return NextResponse.json({ message: 'Creador no encontrado' }, { status: 404 });

    const stripe = getStripe();
    const customerId = await ensureStripeCustomer(session.user.id);

    const success = `${appBaseUrl()}/payments/success?type=tip&creatorId=${creatorId}&redirect=/profile/${creatorId}`;
    const cancel = `${appBaseUrl()}/payments/cancel`;

    const checkout = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: cur,
            product_data: { name: `Propina para @${creator.username}` },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      success_url: success,
      cancel_url: cancel,
      metadata: {
        type: 'tip',
        creatorId: String(creatorId),
        buyerId: String(session.user.id),
      },
    });

    return NextResponse.json({ url: checkout.url });
  } catch (err) {
    console.error('Error creando Checkout TIP:', err);
    return NextResponse.json({ message: 'Error creando checkout' }, { status: 500 });
  }
}

