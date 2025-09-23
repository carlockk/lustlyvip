import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });

    await dbConnect();
    const me = await User.findById(session.user.id).select('favorites').lean();
    if (!me) return NextResponse.json({ favorites: [] }, { status: 200 });

    const favorites = await User.find({ _id: { $in: me.favorites || [] } })
      .select('username profilePicture coverPhoto')
      .lean();
    const items = favorites.map(u => ({
      _id: u._id.toString(),
      username: u.username,
      profilePicture: u.profilePicture || null,
      coverPhoto: u.coverPhoto || null,
    }));
    return NextResponse.json({ favorites: items }, { status: 200 });
  } catch (err) {
    console.error('Error listando favoritos:', err);
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
}

