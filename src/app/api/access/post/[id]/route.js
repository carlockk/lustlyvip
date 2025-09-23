// src/app/api/access/post/[id]/route.js

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import Post from '@/models/Post';
import Subscription from '@/models/Subscription';
import Purchase from '@/models/Purchase';
import mongoose from 'mongoose';

export async function GET(_req, { params }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ access: false, reason: 'no-auth' }, { status: 200 });

    await dbConnect();

    const postId = params.id;
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return NextResponse.json({ access: false, reason: 'invalid-post' }, { status: 200 });
    }

    const post = await Post.findById(postId).select('creator isExclusive').lean();
    if (!post) return NextResponse.json({ access: false, reason: 'not-found' }, { status: 200 });

    // Si no es exclusivo, acceso libre
    if (!post.isExclusive) return NextResponse.json({ access: true, reason: 'public' }, { status: 200 });

    // Anteriormente: si no había precio, se consideraba público.
    // Ahora: el exclusivo sigue bloqueado salvo suscripción activa (Stripe o free) o PPV.

    const userId = new mongoose.Types.ObjectId(session.user.id);
    const creatorId = new mongoose.Types.ObjectId(post.creator);

    // El creador siempre tiene acceso
    if (userId.equals(creatorId)) return NextResponse.json({ access: true, reason: 'owner' }, { status: 200 });

    // Suscripción activa de Stripe (con stripeSubscriptionId). Las suscripciones 'free' NO otorgan acceso a exclusivos
    const activeSub = await Subscription.findOne({ subscriberId: userId, creatorId, status: 'active', stripeSubscriptionId: { $ne: null } }).lean();
    if (activeSub) return NextResponse.json({ access: true, reason: 'subscription' }, { status: 200 });

    // PPV comprado
    const purchase = await Purchase.findOne({ buyerId: userId, postId: postId, status: 'succeeded' }).lean();
    if (purchase) return NextResponse.json({ access: true, reason: 'ppv' }, { status: 200 });

    return NextResponse.json({ access: false, reason: 'locked' }, { status: 200 });
  } catch (err) {
    console.error('Error comprobando acceso a post:', err);
    return NextResponse.json({ access: false, reason: 'error' }, { status: 200 });
  }
}
