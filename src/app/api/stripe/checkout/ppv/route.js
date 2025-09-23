// src/app/api/stripe/checkout/ppv/route.js

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ensureStripeCustomer, getStripe } from '@/lib/stripe';
import dbConnect from '@/lib/dbConnect';
import Post from '@/models/Post';
import User from '@/models/User';

export async function POST(req) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });

    const { postId } = await req.json();
    if (!postId) {
      return NextResponse.json({ message: 'Falta postId' }, { status: 400 });
    }

    await dbConnect();
    const post = await Post.findById(postId).select('creator isExclusive ppvEnabled ppvAmountCents ppvCurrency').lean();
    if (!post) return NextResponse.json({ message: 'Post no encontrado' }, { status: 404 });
    if (!post.isExclusive) return NextResponse.json({ message: 'El post no requiere PPV' }, { status: 400 });

    // Determinar precio PPV
    let amount = post.ppvAmountCents;
    let currency = (post.ppvCurrency || 'usd').toLowerCase();
    if (!post.ppvEnabled || !amount) {
      // Fallback a env default si no hay precio definido
      const def = parseInt(process.env.NEXT_PUBLIC_PPV_DEFAULT_CENTS || '500', 10);
      amount = Number.isFinite(def) && def > 0 ? def : 500;
      currency = 'usd';
    }

    const stripe = getStripe();
    const customerId = await ensureStripeCustomer(session.user.id);

    const creatorId = String(post.creator);
    const origin = new URL(req.url).origin;
    const success = `${origin}/payments/success?type=ppv&postId=${postId}&creatorId=${creatorId}&redirect=/profile/${creatorId}&session_id={CHECKOUT_SESSION_ID}`;
    const cancel = `${origin}/payments/cancel`;

    const platformFeePercent = Number(process.env.PLATFORM_FEE_PERCENT || '3');
    const creator = await User.findById(creatorId).select('stripeConnectId stripeConnectChargesEnabled').lean();
    const useConnect = !!process.env.STRIPE_CONNECT_ENABLED && !!creator?.stripeConnectId && creator?.stripeConnectChargesEnabled !== false;

    const base = {
      mode: 'payment',
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency,
            product_data: { name: `Post #${postId}` },
            unit_amount: amount, // centavos
          },
          quantity: 1,
        },
      ],
      success_url: success,
      cancel_url: cancel,
      metadata: {
        type: 'ppv',
        creatorId,
        postId,
        buyerId: String(session.user.id),
      },
    };

    if (useConnect) {
      const fee = Math.round((amount * platformFeePercent) / 100);
      base.payment_intent_data = {
        application_fee_amount: fee,
        transfer_data: { destination: creator.stripeConnectId },
      };
    }

    const checkout = await stripe.checkout.sessions.create(base);

    return NextResponse.json({ url: checkout.url });
  } catch (err) {
    console.error('Error creando Checkout PPV:', err);
    return NextResponse.json({ message: 'Error creando checkout' }, { status: 500 });
  }
}
