import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import mongoose from 'mongoose';

export async function POST(_req, { params }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
    const creatorId = params.id;
    if (!mongoose.Types.ObjectId.isValid(creatorId)) return NextResponse.json({ message: 'ID inválido' }, { status: 400 });
    if (String(creatorId) === String(session.user.id)) return NextResponse.json({ message: 'No puedes agregarte a ti mismo' }, { status: 400 });
    await dbConnect();
    const me = await User.findById(session.user.id);
    if (!me) return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 });
    me.favorites = me.favorites || [];
    const exists = me.favorites.some(f => String(f) === String(creatorId));
    if (!exists) me.favorites.push(new mongoose.Types.ObjectId(creatorId));
    await me.save();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Error agregando favorito:', err);
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
    const creatorId = params.id;
    if (!mongoose.Types.ObjectId.isValid(creatorId)) return NextResponse.json({ message: 'ID inválido' }, { status: 400 });
    await dbConnect();
    const me = await User.findById(session.user.id);
    if (!me) return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 });
    me.favorites = (me.favorites || []).filter(f => String(f) !== String(creatorId));
    await me.save();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Error quitando favorito:', err);
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
}

