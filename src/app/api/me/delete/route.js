import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '@/models/User';
import Post from '@/models/Post';
import Subscription from '@/models/Subscription';
import Purchase from '@/models/Purchase';
import Message from '@/models/Message';

export async function DELETE(req) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
    await dbConnect();
    const userId = new mongoose.Types.ObjectId(session.user.id);

    // Re-autenticación: solicitar contraseña
    let password = null;
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try { const body = await req.json(); password = body?.password || null; } catch {}
    } else {
      // También permitimos header opcional
      password = req.headers.get('x-password');
    }
    if (!password) return NextResponse.json({ message: 'Se requiere contraseña' }, { status: 400 });

    const user = await User.findById(userId).select('password');
    if (!user) return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return NextResponse.json({ message: 'Contraseña incorrecta' }, { status: 403 });

    await Post.updateMany({ likes: userId }, { $pull: { likes: userId } });
    await Post.deleteMany({ creator: userId });
    await Subscription.deleteMany({ $or: [{ subscriberId: userId }, { creatorId: userId }] });
    await Purchase.deleteMany({ $or: [{ buyerId: userId }, { creatorId: userId }] });
    await Message.deleteMany({ $or: [{ senderId: userId }, { receiverId: userId }] });
    await User.updateMany({ favorites: userId }, { $pull: { favorites: userId } });
    await User.findByIdAndDelete(userId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Error eliminando cuenta:', err);
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
}
