// src/app/api/creators/monetization/toggle/route.js
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';

// GET: devuelve estado actual; POST: actualiza estado
export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
    await dbConnect();
    const user = await User.findById(session.user.id).select('monetizationEnabled').lean();
    return NextResponse.json({ monetizationEnabled: !!user?.monetizationEnabled });
  } catch (e) {
    return NextResponse.json({ message: 'Error leyendo estado' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });

    const { enabled } = await req.json();
    await dbConnect();
    await User.updateOne({ _id: session.user.id }, { $set: { monetizationEnabled: !!enabled } });
    return NextResponse.json({ ok: true, monetizationEnabled: !!enabled });
  } catch (e) {
    return NextResponse.json({ message: 'Error actualizando estado' }, { status: 500 });
  }
}
