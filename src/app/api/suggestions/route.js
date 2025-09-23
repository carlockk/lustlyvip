// src/app/api/suggestions/route.js
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import Subscription from '@/models/Subscription';

export async function GET() {
  try {
    await dbConnect();
    const session = await auth();

    if (!session) {
      return NextResponse.json({ message: 'No autenticado.' }, { status: 401 });
    }

    const userId = session.user.id;

    // IDs de creadores ya suscritos
    const subscribedTo = await Subscription.find({ subscriberId: userId }).select('creatorId');
    const subscribedIds = subscribedTo.map((sub) => sub.creatorId);

    // Excluirme a mí + ya suscritos
    const excludeIds = [userId, ...subscribedIds];

    // Sugerencias (puedes ajustar el criterio de orden si prefieres por “más recientes”)
    const suggestedUsers = await User.find({
      _id: { $nin: excludeIds },
    })
      .limit(8)
      .select('username profilePicture coverPhoto') // 👈 incluimos cover
      .lean();

    // Normalizamos y aplicamos fallback de cover
    const users = (suggestedUsers || []).map((u) => ({
      _id: String(u._id),
      username: u.username,
      profilePicture: u.profilePicture || '',
      coverPhoto: u.coverPhoto || '/images/placeholder-cover.jpg', // 👈 fallback
    }));

    return NextResponse.json({ users }, { status: 200 });
  } catch (error) {
    console.error('Error al obtener sugerencias de usuarios:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
