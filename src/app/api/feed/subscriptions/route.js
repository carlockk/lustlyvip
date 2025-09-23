import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import Post from '@/models/Post';
import Subscription from '@/models/Subscription';
import mongoose from 'mongoose';

export async function GET(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!session) return NextResponse.json({ message: 'No autenticado.' }, { status: 401 });
    const userId = session.user.id;

    const url = new URL(req.url);
    const limit = Math.max(1, Math.min(parseInt(url.searchParams.get('limit') || '10', 10) || 10, 50));
    const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10) || 0);

    const subs = await Subscription.find({ subscriberId: userId, status: { $in: ['active','trialing','past_due'] } }).select('creatorId stripeSubscriptionId').lean();
    const paidCreatorIds = subs.filter(s => !!s.stripeSubscriptionId).map(s => s.creatorId?.toString()).filter(Boolean);
    const freeCreatorIds = subs.filter(s => !s.stripeSubscriptionId).map(s => s.creatorId?.toString()).filter(Boolean);
    if (paidCreatorIds.length + freeCreatorIds.length === 0) return NextResponse.json({ posts: [] }, { status: 200 });

    const toObjectIds = (arr) => arr.filter(Boolean).map(id => new mongoose.Types.ObjectId(id));
    const or = [];
    if (paidCreatorIds.length) or.push({ creator: { $in: toObjectIds(paidCreatorIds) } });
    if (freeCreatorIds.length) or.push({ creator: { $in: toObjectIds(freeCreatorIds) }, isExclusive: false });
    const filter = or.length === 1 ? or[0] : { $or: or };

    const posts = await Post.find(filter)
      .populate('creator', 'username email profilePicture')
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    return NextResponse.json({ posts }, { status: 200 });
  } catch (e) {
    console.error('feed subscriptions error', e);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}

