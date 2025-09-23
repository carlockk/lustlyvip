// src/app/api/creators/monetization/plans/route.js

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import { getStripe } from '@/lib/stripe';

const PLAN_DEFS = {
  day_1: { label: 'Diario', interval: 'day', interval_count: 1 },
  week_1: { label: 'Semanal', interval: 'week', interval_count: 1 },
  month_1: { label: 'Mensual', interval: 'month', interval_count: 1 },
  month_3: { label: '3 meses', interval: 'month', interval_count: 3 },
  month_6: { label: '6 meses', interval: 'month', interval_count: 6 },
  year_1: { label: 'Anual', interval: 'year', interval_count: 1 },
};

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
    await dbConnect();
    const user = await User.findById(session.user.id).select('stripeProductId stripePrices stripeIntroPercents stripeCoupons username');
    if (!user) return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 });
    return NextResponse.json({
      productId: user.stripeProductId,
      prices: user.stripePrices || {},
      introPercents: user.stripeIntroPercents || {},
      coupons: user.stripeCoupons || {},
      plans: PLAN_DEFS,
    });
  } catch (err) {
    console.error('Error obteniendo planes de monetización:', err);
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
}

// Crea/actualiza precios por plan y cupones introductorios (duration: 'once')
export async function POST(req) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
    const { currency = 'usd', plans } = await req.json();
    if (!plans || typeof plans !== 'object') {
      return NextResponse.json({ message: 'Payload inválido' }, { status: 400 });
    }

    await dbConnect();
    const user = await User.findById(session.user.id);
    if (!user) return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 });

    const stripe = getStripe();

    // Asegurar producto
    let productId = user.stripeProductId;
    if (!productId) {
      const product = await stripe.products.create({
        name: `Suscripción ${user.username}`,
        metadata: { appUserId: String(user._id) },
      });
      productId = product.id;
      user.stripeProductId = productId;
    }

    const pricesMap = user.stripePrices || {};
    const introPercentsMap = user.stripeIntroPercents || {};
    const couponsMap = user.stripeCoupons || {};

    // Por cada plan definido en request, crear/actualizar price y cupón
    for (const [key, cfg] of Object.entries(plans)) {
      const def = PLAN_DEFS[key];
      if (!def) continue;
      const amount = parseInt(cfg?.amount, 10);
      if (!Number.isFinite(amount) || amount <= 0) continue;

      // Crear un nuevo price (Stripe no permite editar)
      const price = await stripe.prices.create({
        unit_amount: amount,
        currency,
        product: productId,
        recurring: { interval: def.interval, interval_count: def.interval_count },
        nickname: `${def.label}`,
      });
      pricesMap[key] = price.id;

      // Descuento introductorio (solo primera factura)
      const introPercent = Math.max(0, Math.min(100, parseInt(cfg?.introPercent || 0, 10) || 0));
      introPercentsMap[key] = introPercent;
      if (introPercent > 0) {
        // Creamos un cupón duration: 'once' restringido al producto del creador
        const coupon = await stripe.coupons.create({
          percent_off: introPercent,
          duration: 'once',
          applies_to: { products: [productId] },
          name: `Intro ${def.label} ${introPercent}% - @${user.username}`,
        });
        couponsMap[key] = coupon.id;
      }
    }

    user.stripePrices = pricesMap;
    user.stripeIntroPercents = introPercentsMap;
    user.stripeCoupons = couponsMap;
    await user.save();

    return NextResponse.json({ productId, prices: pricesMap, introPercents: introPercentsMap, coupons: couponsMap });
  } catch (err) {
    console.error('Error guardando planes de monetización:', err);
    return NextResponse.json({ message: 'Error configurando monetización' }, { status: 500 });
  }
}
