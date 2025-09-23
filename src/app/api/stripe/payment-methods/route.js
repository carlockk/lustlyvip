// src/app/api/stripe/payment-methods/route.js

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ensureStripeCustomer, getStripe } from '@/lib/stripe';

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });

    const stripe = getStripe();
    const customerId = await ensureStripeCustomer(session.user.id);

    const [customer, pms] = await Promise.all([
      stripe.customers.retrieve(customerId),
      stripe.paymentMethods.list({ customer: customerId, type: 'card' }),
    ]);

    const defaultPm = customer?.invoice_settings?.default_payment_method || null;
    const items = (pms?.data || []).map(pm => ({
      id: pm.id,
      brand: pm.card?.brand,
      last4: pm.card?.last4,
      exp_month: pm.card?.exp_month,
      exp_year: pm.card?.exp_year,
      is_default: typeof defaultPm === 'string' ? defaultPm === pm.id : defaultPm?.id === pm.id,
    }));

    return NextResponse.json({ paymentMethods: items });
  } catch (err) {
    console.error('Error listando métodos de pago:', err);
    return NextResponse.json({ message: 'Error listando métodos de pago' }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
    const { defaultPaymentMethodId } = await req.json();
    if (!defaultPaymentMethodId) return NextResponse.json({ message: 'Falta defaultPaymentMethodId' }, { status: 400 });

    const stripe = getStripe();
    const customerId = await ensureStripeCustomer(session.user.id);
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: defaultPaymentMethodId },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Error actualizando método de pago por defecto:', err);
    return NextResponse.json({ message: 'Error actualizando método por defecto' }, { status: 500 });
  }
}

