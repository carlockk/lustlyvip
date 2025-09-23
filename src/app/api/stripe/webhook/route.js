// src/app/api/stripe/webhook/route.js

import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import dbConnect from '@/lib/dbConnect';
import Subscription from '@/models/Subscription';
import Purchase from '@/models/Purchase';

export const runtime = 'nodejs';

export async function POST(req) {
  const stripe = getStripe();
  const sig = req.headers.get('stripe-signature');
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!whSecret) return NextResponse.json({ message: 'Falta STRIPE_WEBHOOK_SECRET' }, { status: 500 });

  const payload = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(payload, sig, whSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    await dbConnect();

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const metadata = session.metadata || {};
        if (metadata.type === 'subscription') {
          // La suscripción queda activa cuando invoice.paid, pero marcamos registro base
          // stripeSubscriptionId está en session.subscription
          await Subscription.findOneAndUpdate(
            { subscriberId: metadata.subscriberId, creatorId: metadata.creatorId },
            {
              $set: {
                stripeSubscriptionId: session.subscription,
                priceId: (session.line_items?.[0]?.price?.id) || null,
                status: 'active',
              },
            },
            { upsert: true, new: true }
          );

          // Programar cancelación si se indicó en el checkout (auto-cancel al final o fecha específica)
          try {
            const autoCancel = metadata.autoCancelAtPeriodEnd === '1';
            const cancelAtRaw = metadata.cancelAt && String(metadata.cancelAt).trim();
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
          } catch (e) {
            console.error('No se pudo programar cancelación de suscripción:', e);
          }
        } else if (metadata.type === 'ppv') {
          // Crear registro de compra básica. Estado final se ajusta con payment_intent.succeeded
          await Purchase.findOneAndUpdate(
            { buyerId: metadata.buyerId, postId: metadata.postId },
            {
              $set: {
                creatorId: metadata.creatorId,
                stripePaymentIntentId: session.payment_intent || null,
                status: 'processing',
              },
            },
            { upsert: true, new: true }
          );
        }
        break;
      }
      case 'invoice.paid': {
        const invoice = event.data.object;
        const subId = invoice.subscription;
        const periodEnd = invoice.lines?.data?.[0]?.period?.end;
        await Subscription.findOneAndUpdate(
          { stripeSubscriptionId: subId },
          { $set: { status: 'active', currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null } }
        );
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await Subscription.findOneAndUpdate(
          { stripeSubscriptionId: subscription.id },
          { $set: { status: subscription.status, currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null } }
        );
        break;
      }
      case 'payment_intent.succeeded': {
        const pi = event.data.object;
        const amount = pi.amount_received;
        const currency = pi.currency;
        const feePercent = parseFloat(process.env.PLATFORM_FEE_PERCENT || '3');
        const pct = Number.isFinite(feePercent) ? feePercent : 3;
        const platformFee = Math.floor((pct * amount) / 100);
        const creatorNet = Math.max(0, amount - platformFee);
        await Purchase.findOneAndUpdate(
          { stripePaymentIntentId: pi.id },
          { $set: { status: 'succeeded', amount, currency, platformFeeCents: platformFee, creatorNetCents: creatorNet } }
        );
        break;
      }
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Error procesando webhook:', err);
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
}
