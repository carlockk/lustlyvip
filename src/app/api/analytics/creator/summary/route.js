// src/app/api/analytics/creator/summary/route.js

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import Purchase from '@/models/Purchase';
import Subscription from '@/models/Subscription';

export async function GET(req) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });

    await dbConnect();
    const creatorId = session.user.id;

    const url = new URL(req.url);
    const range = (url.searchParams.get('range') || '').toLowerCase();
    const fromParam = url.searchParams.get('from');
    const toParam = url.searchParams.get('to');
    const now = new Date();
    let from = null, to = null;
    if (fromParam) from = new Date(fromParam);
    if (toParam) to = new Date(toParam);
    if (!from && !to) {
      const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
      from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    }
    if (!to) to = now;

    const dateFilter = { createdAt: {} };
    if (from) dateFilter.createdAt.$gte = from;
    if (to) dateFilter.createdAt.$lte = to;
    if (!dateFilter.createdAt.$gte) delete dateFilter.createdAt.$gte;
    if (!dateFilter.createdAt.$lte) delete dateFilter.createdAt.$lte;
    if (!Object.keys(dateFilter.createdAt).length) delete dateFilter.createdAt;

    const purchases = await Purchase.find({ creatorId, status: 'succeeded', ...(dateFilter.createdAt ? dateFilter : {}) }).lean();
    const subsActive = await Subscription.countDocuments({ creatorId, status: 'active' });

    const totals = purchases.reduce((acc, p) => {
      const cur = (p.currency || 'usd').toLowerCase();
      acc[cur] = acc[cur] || { gross: 0, fee: 0, net: 0 };
      acc[cur].gross += p.amount || 0;
      acc[cur].fee += p.platformFeeCents || 0;
      acc[cur].net += p.creatorNetCents || 0;
      return acc;
    }, {});

    const byPost = new Map();
    for (const p of purchases) {
      const key = String(p.postId);
      const cur = (p.currency || 'usd').toLowerCase();
      const o = byPost.get(key) || { postId: key, count: 0, gross: 0, net: 0, currency: cur };
      o.count += 1;
      o.gross += p.amount || 0;
      o.net += p.creatorNetCents || 0;
      o.currency = cur;
      byPost.set(key, o);
    }
    const topPosts = Array.from(byPost.values()).sort((a,b)=>b.count-a.count).slice(0,10);

    // Vistas por rango
    const { default: PostView } = await import('@/models/PostView');
    const viewFilter = { creatorId, ...(dateFilter.createdAt ? dateFilter : {}) };
    const views = await PostView.find(viewFilter).select('postId createdAt').lean();
    const viewsTotal = views.length;
    const viewsByPost = new Map();
    for (const v of views) {
      const key = String(v.postId);
      viewsByPost.set(key, (viewsByPost.get(key) || 0) + 1);
    }
    const topViewedPosts = Array.from(viewsByPost.entries()).map(([postId, count]) => ({ postId, count })).sort((a,b)=>b.count-a.count).slice(0,10);

    return NextResponse.json({ totals, subsActive, topPosts, viewsTotal, topViewedPosts, range: { from, to } });
  } catch (err) {
    console.error('Error en summary de creador:', err);
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
}
