// src/app/api/stripe/connect/onboard/route.js
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import { getStripe } from '@/lib/stripe';

export async function POST(req) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
    const userId = session.user.id;
    await dbConnect();
    const user = await User.findById(userId).select('stripeConnectId').lean();
    const stripe = getStripe();

    let accountId = user?.stripeConnectId;
    if (!accountId) {
      const account = await stripe.accounts.create({ type: 'express' });
      accountId = account.id;
      await User.updateOne({ _id: userId }, { $set: { stripeConnectId: accountId } });
    }

    const origin = new URL(req.url).origin;
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/profile`,
      return_url: `${origin}/profile`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url, accountId });
  } catch (e) {
    console.error('connect onboard error', e);
    return NextResponse.json({ message: 'Error creando onboarding' }, { status: 500 });
  }
}

