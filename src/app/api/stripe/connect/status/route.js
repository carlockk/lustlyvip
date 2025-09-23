import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import { getStripe } from '@/lib/stripe';

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
    await dbConnect();
    const user = await User.findById(session.user.id).select('stripeConnectId stripeConnectChargesEnabled').lean();
    const connected = !!user?.stripeConnectId;
    const chargesEnabled = !!user?.stripeConnectChargesEnabled;
    return NextResponse.json({ connected, chargesEnabled, accountId: user?.stripeConnectId || null });
  } catch (e) {
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
    await dbConnect();
    const user = await User.findById(session.user.id).select('stripeConnectId');
    if (!user?.stripeConnectId) return NextResponse.json({ connected: false, chargesEnabled: false, accountId: null });
    const stripe = getStripe();
    const acct = await stripe.accounts.retrieve(user.stripeConnectId);
    const chargesEnabled = !!acct?.charges_enabled;
    user.stripeConnectChargesEnabled = chargesEnabled;
    await user.save();
    return NextResponse.json({ connected: true, chargesEnabled, accountId: user.stripeConnectId });
  } catch (e) {
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}

