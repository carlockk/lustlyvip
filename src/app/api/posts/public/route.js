// src/app/api/posts/public/route.js
import { NextResponse } from 'next/server';
import mongoose, { Schema } from 'mongoose';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function connectMongo() {
  if (mongoose.connection.readyState === 1) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Falta la variable de entorno MONGODB_URI');
  if (global._lustly_conn) { await global._lustly_conn; return; }
  global._lustly_conn = mongoose.connect(uri, { maxPoolSize: 5 });
  await global._lustly_conn;
}

// Esquemas mínimos (solo para este endpoint)
const UserSchema =
  mongoose.models._LustlyUser ||
  mongoose.model(
    '_LustlyUser',
    new Schema(
      { username: String, profilePicture: String },
      { collection: 'users', timestamps: false }
    )
  );

const PostSchema =
  mongoose.models._LustlyPost ||
  mongoose.model(
    '_LustlyPost',
    new Schema(
      {
        creator: { type: Schema.Types.ObjectId, ref: 'users' },
        isExclusive: Boolean,
        ppvEnabled: Boolean,
        ppvAmountCents: Number,
        ppvCurrency: String,
        imageUrl: String,
        videoUrl: String,
        text: String,
        createdAt: Date,
      },
      { collection: 'posts', timestamps: true }
    )
  );

// GET /api/posts/public?limit=18  -> máximo N creadores (1 post por creador)
export async function GET(req) {
  try {
    await connectMongo();

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '18', 10), 50);

    // Pipeline: ordenar por fecha desc, agrupar por creador y tomar el último post de cada creador
    const latestPerCreator = await PostSchema.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$creator',
          post: { $first: '$$ROOT' }, // el más reciente por creador
        },
      },
      { $limit: limit }, // limite de creadores
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
          _id: '$post._id',
          creatorId: '$_id',
          isExclusive: '$post.isExclusive',
          ppvEnabled: '$post.ppvEnabled',
          ppvAmountCents: '$post.ppvAmountCents',
          ppvCurrency: '$post.ppvCurrency',
          imageUrl: '$post.imageUrl',
          videoUrl: '$post.videoUrl',
          text: '$post.text',
          createdAt: '$post.createdAt',
          creator: {
            _id: '$creatorDoc._id',
            username: '$creatorDoc.username',
            profilePicture: '$creatorDoc.profilePicture',
          },
        },
      },
      { $sort: { createdAt: -1 } }, // para que la lista final también quede por fecha
    ]);

    const safe = latestPerCreator.map((p) => ({
      _id: String(p._id),
      creatorId: String(p.creatorId),
      creator: p.creator
        ? {
            _id: String(p.creator._id),
            username: p.creator.username || 'user',
            profilePicture: p.creator.profilePicture || '',
          }
        : null,
      isExclusive: !!p.isExclusive,
      ppvEnabled: !!p.ppvEnabled,
      ppvAmountCents: p.ppvAmountCents ?? null,
      ppvCurrency: p.ppvCurrency || 'usd',
      imageUrl: p.imageUrl || null,
      videoUrl: p.videoUrl || null,
      text: p.text || '',
      createdAt: p.createdAt || new Date(),
    }));

    return NextResponse.json({ posts: safe }, { status: 200 });
  } catch (e) {
    console.error('[/api/posts/public] error:', e);
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}
