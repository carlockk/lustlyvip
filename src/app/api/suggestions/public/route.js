// src/app/api/suggestions/public/route.js
import { NextResponse } from 'next/server';
import mongoose, { Schema } from 'mongoose';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function connectMongo() {
  if (mongoose.connection.readyState === 1) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Falta MONGODB_URI');
  if (global._lustly_conn) { await global._lustly_conn; return; }
  global._lustly_conn = mongoose.connect(uri, { maxPoolSize: 5 });
  await global._lustly_conn;
}

// Modelos mínimos (nombre de modelo interno distinto, apuntando a colecciones reales)
const UserModel =
  mongoose.models._LustlyUser2 ||
  mongoose.model(
    '_LustlyUser2',
    new Schema(
      {
        username: String,
        profilePicture: String,
        coverPhoto: String, // 👈 añadimos cover
      },
      { collection: 'users', timestamps: false }
    )
  );

const PostModel =
  mongoose.models._LustlyPost2 ||
  mongoose.model(
    '_LustlyPost2',
    new Schema(
      {
        creator: { type: Schema.Types.ObjectId, ref: 'users' },
        createdAt: Date,
      },
      { collection: 'posts', timestamps: true }
    )
  );

export async function GET(req) {
  try {
    await connectMongo();

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '8', 10), 24);

    // Tomamos los últimos creadores que publicaron (1 por creador)
    const latestCreators = await PostModel.aggregate([
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$creator', latestPostAt: { $first: '$createdAt' } } },
      { $sort: { latestPostAt: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'creatorDoc',
        },
      },
      { $unwind: { path: '$creatorDoc', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          latestPostAt: 1,
          username: '$creatorDoc.username',
          profilePicture: '$creatorDoc.profilePicture',
          coverPhoto: '$creatorDoc.coverPhoto', // 👈 portada
        },
      },
    ]);

    const users = latestCreators
      .filter((c) => c?.username) // descarta usuarios sin doc visible
      .map((c) => ({
        _id: String(c._id),
        username: c.username || 'user',
        profilePicture: c.profilePicture || '',
        coverPhoto: c.coverPhoto || '/images/placeholder-cover.jpg', // 👈 fallback
        latestPostAt: c.latestPostAt || null,
      }));

    return NextResponse.json({ users }, { status: 200 });
  } catch (e) {
    console.error('[/api/suggestions/public] error:', e);
    return NextResponse.json({ users: [] }, { status: 200 });
  }
}
