// src/app/api/creators/[id]/price/route.js

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';

export async function GET(_req, { params }) {
  try {
    await dbConnect();
    const user = await User.findById(params.id).select('stripePriceId stripeProductId stripePrices stripeCoupons stripeIntroPercents username');
    if (!user) return NextResponse.json({ message: 'Creador no encontrado' }, { status: 404 });
    // Construimos lista normalizada de planes disponibles
    const plans = [];
    const map = user.stripePrices || {};
    const pushPlan = (key, label, interval, intervalCount, priceId) => {
      if (priceId) plans.push({
        key,
        label,
        interval,
        intervalCount,
        priceId,
        couponId: user?.stripeCoupons?.[key] || null,
        introPercent: (user?.stripeIntroPercents?.[key] ?? 0),
      });
    };
    // Compat: priceId mensual legado
    pushPlan('month_1', 'Mensual', 'month', 1, user.stripePriceId);
    // Nuevos (si existen)
    pushPlan('day_1', 'Diario', 'day', 1, map?.day_1);
    pushPlan('week_1', 'Semanal', 'week', 1, map?.week_1);
    pushPlan('month_1_alt', 'Mensual', 'month', 1, map?.month_1); // por si hay un mensual nuevo
    pushPlan('month_3', '3 meses', 'month', 3, map?.month_3);
    pushPlan('month_6', '6 meses', 'month', 6, map?.month_6);
    pushPlan('year_1', 'Anual', 'year', 1, map?.year_1);

    // Filtrar duplicados por priceId conservando el primero
    const seen = new Set();
    const uniquePlans = plans.filter(p => {
      if (!p.priceId) return false;
      if (seen.has(p.priceId)) return false;
      seen.add(p.priceId);
      return true;
    });

    // Enriquecer con amounts/currency desde Stripe (opcional)
    try {
      const { getStripe } = await import('@/lib/stripe');
      const stripe = getStripe();
      const enriched = [];
      for (const p of uniquePlans) {
        try {
          const pr = await stripe.prices.retrieve(p.priceId);
          enriched.push({ ...p, amount: pr.unit_amount || null, currency: pr.currency || null });
        } catch {
          enriched.push(p);
        }
      }
      return NextResponse.json({ priceId: user.stripePriceId, productId: user.stripeProductId, username: user.username, plans: enriched });
    } catch {
      return NextResponse.json({ priceId: user.stripePriceId, productId: user.stripeProductId, username: user.username, plans: uniquePlans });
    }
  } catch (err) {
    console.error('Error obteniendo price del creador:', err);
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
}
