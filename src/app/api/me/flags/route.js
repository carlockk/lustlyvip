// src/app/api/me/flags/route.js

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import Post from '@/models/Post';

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });

    await dbConnect();
    const user = await User.findById(session.user.id).select('role stripePriceId stripePrices').lean();
    const postsCount = await Post.countDocuments({ creator: session.user.id });
    const hasAnyPrice = !!(user?.stripePriceId || user?.stripePrices?.week_1 || user?.stripePrices?.month_1 || user?.stripePrices?.month_3 || user?.stripePrices?.month_6 || user?.stripePrices?.year_1);
    const isCreator = (user?.role === 'creator') || hasAnyPrice || postsCount > 0;

    return NextResponse.json({ isCreator });
  } catch (err) {
    console.error('Error obteniendo flags de usuario:', err);
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
}
