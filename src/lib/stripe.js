// src/lib/stripe.js

import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Falta STRIPE_SECRET_KEY en el entorno');
  }
  // Cargar stripe con require dinámico para evitar fallos si aún no está instalado en build previo
  // Nota: hay que instalar la dependencia `stripe`.
  // eslint-disable-next-line global-require
  const Stripe = require('stripe');
  return new Stripe(secretKey, { apiVersion: '2024-06-20' });
}

export async function ensureStripeCustomer(userId) {
  await dbConnect();
  const user = await User.findById(userId);
  if (!user) throw new Error('Usuario no encontrado');

  if (user.stripeCustomerId) return user.stripeCustomerId;

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    metadata: { appUserId: String(user._id) },
    email: user.email || undefined,
    name: user.username || undefined,
  });

  user.stripeCustomerId = customer.id;
  await user.save();

  return customer.id;
}

export function appBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}
