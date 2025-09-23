// src/app/api/purchases/route.js

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import Purchase from '@/models/Purchase';

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });

    await dbConnect();
    const buyerId = session.user.id;
    const purchases = await Purchase.find({ buyerId })
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json({ purchases });
  } catch (err) {
    console.error('Error obteniendo compras:', err);
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
}

