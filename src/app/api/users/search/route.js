import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';

export async function GET(req) {
  try {
    await dbConnect();
    const url = new URL(req.url);
    const q = (url.searchParams.get('q') || '').trim();
    if (!q) return NextResponse.json({ users: [] }, { status: 200 });
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const users = await User.find({ username: re }).select('username profilePicture bio').limit(10).lean();
    const mapped = users.map(u => ({ _id: u._id.toString(), username: u.username, profilePicture: u.profilePicture || null, bio: u.bio || null }));
    return NextResponse.json({ users: mapped }, { status: 200 });
  } catch (e) {
    console.error('user search error', e);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}

