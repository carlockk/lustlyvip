// src/app/api/analytics/views/route.js

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import PostView from '@/models/PostView';
import mongoose from 'mongoose';

export async function POST(req) {
  try {
    const session = await auth();
    const { postId, creatorId, anonymousId } = await req.json();
    if (!postId || !creatorId) {
      return NextResponse.json({ message: 'Faltan parámetros' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(postId) || !mongoose.Types.ObjectId.isValid(creatorId)) {
      return NextResponse.json({ message: 'IDs inválidos' }, { status: 400 });
    }

    await dbConnect();

    // De-dup en ventana de 30 minutos por identidad + post
    const since = new Date(Date.now() - 30 * 60 * 1000);
    const q = {
      postId: new mongoose.Types.ObjectId(postId),
      creatorId: new mongoose.Types.ObjectId(creatorId),
      createdAt: { $gte: since },
    };
    if (session) q.viewerId = new mongoose.Types.ObjectId(session.user.id);
    else if (anonymousId) q.anonymousId = String(anonymousId);

    const exists = await PostView.findOne(q).lean();
    if (!exists) {
      await PostView.create({
        postId,
        creatorId,
        viewerId: session ? session.user.id : null,
        anonymousId: session ? null : (anonymousId || null),
      });
    }

    return NextResponse.json({ recorded: true });
  } catch (err) {
    console.error('Error registrando vista:', err);
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
}

