import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import Post from '@/models/Post';
import Subscription from '@/models/Subscription';
import Purchase from '@/models/Purchase';
import mongoose from 'mongoose';

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const toId = (val) => {
  try {
    return new mongoose.Types.ObjectId(val);
  } catch {
    return null;
  }
};

async function hasAccess(post, userId) {
  if (!post) return false;
  if (!post.isExclusive) return true;
  if (!userId) return false;

  const creator = post.creator?._id || post.creator;
  const creatorId = creator ? creator.toString() : null;
  if (!creatorId) return false;
  if (creatorId === userId) return true;

  const subscriberId = toId(userId);
  const creatorObjectId = toId(creatorId);
  if (!subscriberId || !creatorObjectId) return false;

  const activeSubscription = await Subscription.exists({
    subscriberId,
    creatorId: creatorObjectId,
    status: 'active',
    stripeSubscriptionId: { $ne: null },
  });
  if (activeSubscription) return true;

  const purchase = await Purchase.exists({
    buyerId: subscriberId,
    postId: post._id,
    status: 'succeeded',
  });
  return Boolean(purchase);
}

export async function GET(req) {
  try {
    await dbConnect();
    const session = await auth();
    const userId = session?.user?.id ? String(session.user.id) : null;

    const url = new URL(req.url);
    const raw = (url.searchParams.get('q') || '').trim();
    if (!raw) {
      return NextResponse.json({ creators: [], posts: [] }, { status: 200 });
    }

    const escaped = escapeRegex(raw);
    const regex = new RegExp(escaped, 'i');
    const creatorLimit = Math.max(1, Math.min(parseInt(url.searchParams.get('creators') || '5', 10) || 5, 12));
    const postLimit = Math.max(1, Math.min(parseInt(url.searchParams.get('posts') || '6', 10) || 6, 16));
    const creatorPoolLimit = Math.max(creatorLimit, postLimit * 3);

    const creatorDocs = await User.find({ role: 'creator', username: regex })
      .select('username profilePicture bio')
      .limit(creatorPoolLimit)
      .lean();

    const creators = creatorDocs.slice(0, creatorLimit).map((creator) => ({
      _id: creator._id.toString(),
      username: creator.username,
      profilePicture: creator.profilePicture || null,
      bio: creator.bio || '',
    }));

    const creatorIds = creatorDocs.map((creator) => creator._id);
    const postQuery = [{ text: { $regex: regex } }];
    if (creatorIds.length > 0) {
      postQuery.push({ creator: { $in: creatorIds } });
    }

    const rawPosts = await Post.find(postQuery.length > 1 ? { $or: postQuery } : postQuery[0])
      .sort({ createdAt: -1 })
      .limit(postLimit * 4)
      .populate('creator', 'username profilePicture')
      .lean();

    const posts = [];
    for (const post of rawPosts) {
      if (!post?.creator) continue;
      const alreadyAdded = posts.some((item) => item._id === post._id.toString());
      if (alreadyAdded) continue;

      const accessible = await hasAccess(post, userId);
      if (!accessible) continue;

      posts.push({
        _id: post._id.toString(),
        text: typeof post.text === 'string' ? post.text : '',
        createdAt: post.createdAt,
        creator: {
          _id: post.creator._id.toString(),
          username: post.creator.username,
          profilePicture: post.creator.profilePicture || null,
        },
        thumbnail: post.imageUrl || null,
        hasVideo: Boolean(post.videoUrl),
      });

      if (posts.length >= postLimit) {
        break;
      }
    }

    return NextResponse.json({ creators, posts }, { status: 200 });
  } catch (error) {
    console.error('search api error', error);
    return NextResponse.json({ creators: [], posts: [], error: 'internal-error' }, { status: 500 });
  }
}
