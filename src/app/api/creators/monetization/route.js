// src/app/api/creators/monetization/route.js

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import { getStripe } from '@/lib/stripe';

// Crea/actualiza el producto y precio mensual del creador en Stripe
export async function POST(req) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
    const { amount, currency = 'usd', nickname } = await req.json();
    if (!amount || amount <= 0) return NextResponse.json({ message: 'Monto inválido' }, { status: 400 });

    await dbConnect();
    const user = await User.findById(session.user.id);
    if (!user) return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 });

    const stripe = getStripe();

    // Crear producto si no existe
    let productId = user.stripeProductId;
    if (!productId) {
      const product = await stripe.products.create({
        name: `Suscripción ${user.username}`,
        metadata: { appUserId: String(user._id) },
      });
      productId = product.id;
    }

    // Crear nuevo price (Stripe no permite cambiar precio de uno existente)
    const price = await stripe.prices.create({
      unit_amount: amount,
      currency,
      product: productId,
      recurring: { interval: 'month' },
      nickname: nickname || 'Mensualidad',
    });

    // Guardar en el usuario
    user.stripeProductId = productId;
    user.stripePriceId = price.id;
    await user.save();

    return NextResponse.json({ productId, priceId: price.id });
  } catch (err) {
    console.error('Error configurando monetización:', err);
    return NextResponse.json({ message: 'Error configurando monetización' }, { status: 500 });
  }
}

// Devuelve el priceId del creador autenticado (o en el futuro se puede extender con ?userId=)
export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
    await dbConnect();
    const user = await User.findById(session.user.id).select('stripeProductId stripePriceId username');
    if (!user) return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 });
    return NextResponse.json({ priceId: user.stripePriceId, productId: user.stripeProductId, username: user.username });
  } catch (err) {
    console.error('Error obteniendo monetización:', err);
    return NextResponse.json({ message: 'Error obteniendo monetización' }, { status: 500 });
  }
}

