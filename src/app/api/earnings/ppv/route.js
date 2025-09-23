// src/app/api/earnings/ppv/route.js

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import Purchase from '@/models/Purchase';

export async function GET(req) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });

    await dbConnect();
    const creatorId = session.user.id;

    const url = new URL(req.url);
    const fromParam = url.searchParams.get('from');
    const toParam = url.searchParams.get('to');
    const filter = { creatorId, status: 'succeeded' };
    if (fromParam || toParam) {
      filter.createdAt = {};
      if (fromParam) { const d = new Date(fromParam); if (!isNaN(d)) filter.createdAt.$gte = d; }
      if (toParam) { const d2 = new Date(toParam); if (!isNaN(d2)) { d2.setHours(23,59,59,999); filter.createdAt.$lte = d2; } }
      if (!Object.keys(filter.createdAt).length) delete filter.createdAt;
    }

    const purchases = await Purchase.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    const aggregate = purchases.reduce((acc, p) => {
      acc.gross += p.amount || 0;
      acc.fee += p.platformFeeCents || 0;
      acc.net += p.creatorNetCents || 0;
      return acc;
    }, { gross: 0, fee: 0, net: 0, currency: purchases[0]?.currency || 'usd' });

    return NextResponse.json({ aggregate, purchases });
  } catch (err) {
    console.error('Error obteniendo ganancias PPV:', err);
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
}
