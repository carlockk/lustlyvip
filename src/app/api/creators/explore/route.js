// src/app/api/creators/explore/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Post from "@/models/Post";
import User from "@/models/User";

function isImage(url) {
  return typeof url === "string" && /\.(jpeg|jpg|gif|png|webp)$/i.test(url);
}

export async function GET(req) {
  try {
    await dbConnect();

    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "30", 10), 60);

    // 1) Últimos posts y agrupar por creador
    const latestPosts = await Post.find({})
      .sort({ createdAt: -1 })
      .limit(400)
      .lean();

    const byCreator = new Map();
    for (const p of latestPosts) {
      const key = p.creator?.toString();
      if (!key) continue;
      if (!byCreator.has(key)) byCreator.set(key, []);
      const arr = byCreator.get(key);
      if (arr.length < 10) arr.push(p);
    }

    // 2) Ordenar creadores por fecha de post más reciente
    const creatorsSorted = Array.from(byCreator.entries())
      .sort((a, b) => {
        const aLatest = a[1][0]?.createdAt ? new Date(a[1][0].createdAt) : 0;
        const bLatest = b[1][0]?.createdAt ? new Date(b[1][0].createdAt) : 0;
        return bLatest - aLatest;
      })
      .slice(0, limit);

    let items = [];

    if (creatorsSorted.length > 0) {
      const creatorIds = creatorsSorted.map(([id]) => id);
      const creators = await User.find({ _id: { $in: creatorIds } })
        .select("username profilePicture coverPhoto")
        .lean();
      const creatorsMap = new Map(creators.map((c) => [c._id.toString(), c]));

      items = creatorsSorted
        .map(([id, posts]) => {
          const creator = creatorsMap.get(id);
          if (!creator) return null;
          const latest = posts[0];
          const likes = posts.reduce(
            (acc, p) => acc + (Array.isArray(p.likes) ? p.likes.length : 0),
            0
          );
          const images = posts.filter((p) => isImage(p.imageUrl)).length;
          const videos = posts.filter(
            (p) => p.videoUrl || (p.imageUrl && !isImage(p.imageUrl))
          ).length;

          return {
            creator: {
              _id: creator._id.toString(),
              username: creator.username,
              profilePicture: creator.profilePicture || null,
              coverPhoto: creator.coverPhoto || null,
            },
            latestPost: latest
              ? {
                  imageUrl: latest.imageUrl || null,
                  videoUrl: latest.videoUrl || null,
                  createdAt: latest.createdAt,
                }
              : null,
            likes,
            images,
            videos,
          };
        })
        .filter(Boolean);
    }

    // 3) Fallback: si no hay posts, lista creadores recientes igual
    if (items.length === 0) {
      const creators = await User.find({})
        .sort({ createdAt: -1 })
        .limit(limit)
        .select("username profilePicture coverPhoto")
        .lean();

      items = creators.map((c) => ({
        creator: {
          _id: c._id.toString(),
          username: c.username,
          profilePicture: c.profilePicture || null,
          coverPhoto: c.coverPhoto || null,
        },
        latestPost: null,
        likes: 0,
        images: 0,
        videos: 0,
      }));
    }

    return NextResponse.json(
      { creators: items },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" }, // para Explore prefiero no-store
      }
    );
  } catch (e) {
    console.error("explore creators error", e);
    return NextResponse.json(
      { message: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
