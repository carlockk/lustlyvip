// src/app/api/stripe/checkout/confirm/route.js

import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import dbConnect from '@/lib/dbConnect';
import Purchase from '@/models/Purchase';
import Subscription from '@/models/Subscription';

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('session_id');
    if (!sessionId) return NextResponse.json({ message: 'Falta session_id' }, { status: 400 });

    const stripe = getStripe();
    let session = null;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['line_items'] });
    } catch (e) {
      session = await stripe.checkout.sessions.retrieve(sessionId);
    }
    if (!session) return NextResponse.json({ message: 'Sesión no encontrada' }, { status: 404 });

    const md = session.metadata || {};
    await dbConnect();

    if (session.mode === 'payment' && md.type === 'ppv' && session.payment_status === 'paid') {
      const amount = session.amount_total || 0;
      const currency = session.currency || 'usd';
      const feePercent = parseFloat(process.env.PLATFORM_FEE_PERCENT || '3');
      const pct = Number.isFinite(feePercent) ? feePercent : 3;
      const platformFee = Math.floor((pct * amount) / 100);
      const creatorNet = Math.max(0, amount - platformFee);
      await Purchase.findOneAndUpdate(
        { buyerId: md.buyerId, postId: md.postId },
        {
          $set: {
            creatorId: md.creatorId,
            stripePaymentIntentId: session.payment_intent || null,
            status: 'succeeded',
            amount,
            currency,
            platformFeeCents: platformFee,
            creatorNetCents: creatorNet,
          },
        },
        { upsert: true, new: true }
      );
      return NextResponse.json({ ok: true, type: 'ppv' });
    }

    if (session.mode === 'subscription' && md.type === 'subscription') {
      const priceId = session?.line_items?.data?.[0]?.price?.id || null;
      await Subscription.findOneAndUpdate(
        { subscriberId: md.subscriberId, creatorId: md.creatorId },
        {
          $set: {
            stripeSubscriptionId: session.subscription,
            priceId,
            status: 'active',
          },
        },
        { upsert: true, new: true }
      );

      // Intentar programar cancelación si vino marcado
      try {
        const autoCancel = md.autoCancelAtPeriodEnd === '1';
        const cancelAtRaw = md.cancelAt && String(md.cancelAt).trim();
        if ((autoCancel || cancelAtRaw) && session.subscription) {
          if (cancelAtRaw) {
            const ts = parseInt(cancelAtRaw, 10);
            if (Number.isFinite(ts) && ts > 0) {
              await stripe.subscriptions.update(session.subscription, { cancel_at: ts });
            }
          } else if (autoCancel) {
            await stripe.subscriptions.update(session.subscription, { cancel_at_period_end: true });
          }
        }
      } catch {}

      return NextResponse.json({ ok: true, type: 'subscription' });
    }

    return NextResponse.json({ ok: false, message: 'Sesión no confirmable o estado no pagado.' }, { status: 200 });
  } catch (err) {
    console.error('Error confirmando checkout:', err);
    return NextResponse.json({ message: 'Error confirmando', ok: false }, { status: 200 });
  }
}
