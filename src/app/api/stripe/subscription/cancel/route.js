import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import Subscription from '@/models/Subscription';
import { getStripe } from '@/lib/stripe';
import mongoose from 'mongoose';

export async function POST(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!session) return NextResponse.json({ message: 'No autenticado.' }, { status: 401 });

    const { creatorId } = await req.json();
    if (!creatorId || !mongoose.Types.ObjectId.isValid(creatorId)) {
      return NextResponse.json({ message: 'creatorId inválido.' }, { status: 400 });
    }

    const sub = await Subscription.findOne({ subscriberId: session.user.id, creatorId }).lean();
    if (!sub) return NextResponse.json({ message: 'No existe suscripción para cancelar.' }, { status: 404 });

    const stripe = getStripe();
    if (sub.stripeSubscriptionId) {
      try {
        // Cancelación inmediata
        await stripe.subscriptions.del(sub.stripeSubscriptionId);
      } catch (e) {
        console.error('Error cancelando en Stripe:', e);
        return NextResponse.json({ message: 'No se pudo cancelar en Stripe.' }, { status: 502 });
      }
    }

    await Subscription.deleteOne({ _id: sub._id });
    return NextResponse.json({ message: 'Suscripción cancelada.', canceled: true });
  } catch (e) {
    console.error('cancel subscription error', e);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}

