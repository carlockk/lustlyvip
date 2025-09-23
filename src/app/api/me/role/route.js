import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';

export async function PATCH(request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
    const body = await request.json();
    const role = (body?.role || '').toString();
    if (!['creator','consumer'].includes(role)) {
      return NextResponse.json({ message: 'Rol inválido' }, { status: 400 });
    }
    await dbConnect();
    await User.findByIdAndUpdate(session.user.id, { role });
    return NextResponse.json({ ok: true, role });
  } catch (err) {
    console.error('Error cambiando rol:', err);
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
}

