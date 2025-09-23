// src/app/api/auth/register/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { v2 as cloudinary } from "cloudinary";

// Config de Cloudinary (usa CLOUDINARY_URL o variables separadas)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// helper: sube File (Web API) a Cloudinary
async function uploadFileToCloudinary(file, folder) {
  if (!file) return null;
  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const dataURI = `data:${file.type || "application/octet-stream"};base64,${base64}`;
  const res = await cloudinary.uploader.upload(dataURI, {
    folder, // p.ej. "lustly/avatars" o "lustly/covers"
    overwrite: true,
    resource_type: "auto",
  });
  return res.secure_url;
}

export async function POST(req) {
  try {
    await dbConnect();

    const form = await req.formData();
    const username = (form.get("username") || "").toString().trim();
    const email    = (form.get("email") || "").toString().trim().toLowerCase();
    const password = (form.get("password") || "").toString();
    const role     = (form.get("role") || "consumer").toString();

    const profileFile = form.get("profilePicture"); // File | null
    const coverFile   = form.get("coverPhoto");     // File | null

    if (!username || !email || !password) {
      return NextResponse.json({ message: "Faltan campos" }, { status: 400 });
    }

    // ¿usuario ya existe?
    const exists = await User.findOne({ $or: [{ email }, { username }] }).lean();
    if (exists) {
      return NextResponse.json({ message: "Usuario ya existe" }, { status: 409 });
    }

    // subidas (opcionales)
    const [profileUrl, coverUrl] = await Promise.all([
      profileFile instanceof File ? uploadFileToCloudinary(profileFile, "lustly/avatars") : null,
      coverFile   instanceof File ? uploadFileToCloudinary(coverFile,   "lustly/covers")  : null,
    ]);

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password: hashed,
      role, // "consumer" | "creator"
      profilePicture: profileUrl || null,
      coverPhoto: coverUrl || null,
    });

    return NextResponse.json({ ok: true, user: { id: user._id, username, email, role, profilePicture: user.profilePicture, coverPhoto: user.coverPhoto } }, { status: 201 });
  } catch (e) {
    console.error("register error", e);
    return NextResponse.json({ message: "Error del servidor" }, { status: 500 });
  }
}
