// src/app/api/users/[id]/route.js
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import cloudinary from '@/lib/cloudinary';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

// Campos públicos que puede ver cualquiera
const PUBLIC_FIELDS = '_id username profilePicture coverPhoto bio createdAt';

/* =========================
   GET: datos públicos por ID
   ========================= */
export async function GET(_req, { params }) {
  try {
    await dbConnect();
    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'ID de usuario no válido.' }, { status: 400 });
    }

    const user = await User.findById(id).select(PUBLIC_FIELDS).lean();
    if (!user) return NextResponse.json({ message: 'Usuario no encontrado.' }, { status: 404 });

    return NextResponse.json({ user }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('GET /api/users/[id] error:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}

/* =========================
   PATCH: actualizar perfil (dueño)
   ========================= */
export async function PATCH(req, { params }) {
  try {
    await dbConnect();

    const session = await auth();
    if (!session) return NextResponse.json({ message: 'No autenticado.' }, { status: 401 });

    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'ID de usuario no válido.' }, { status: 400 });
    }
    if (String(session.user.id) !== String(id)) {
      return NextResponse.json({ message: 'No tienes permiso para editar este perfil.' }, { status: 403 });
    }

    const formData = await req.formData();
    const updatedData = {};

    // username
    const username = (formData.get('username') || '').trim();
    if (username) {
      // ejemplo de validación simple
      if (!/^[a-zA-Z0-9._-]{3,20}$/.test(username)) {
        return NextResponse.json({ message: 'Username inválido (3-20, letras/números/._-).' }, { status: 400 });
      }
      // si quieres forzar unicidad manual (además del índice único)
      const clash = await User.findOne({ _id: { $ne: id }, username }).select('_id').lean();
      if (clash) return NextResponse.json({ message: 'Ese username ya está en uso.' }, { status: 409 });
      updatedData.username = username;
    }

    // email (si permites editarlo)
    const email = (formData.get('email') || '').trim().toLowerCase();
    if (email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ message: 'Email inválido.' }, { status: 400 });
      }
      // opcional unicidad
      const clash = await User.findOne({ _id: { $ne: id }, email }).select('_id').lean();
      if (clash) return NextResponse.json({ message: 'Ese email ya está en uso.' }, { status: 409 });
      updatedData.email = email;
    }

    // bio
    const bio = (formData.get('bio') || '').trim();
    if (bio) updatedData.bio = bio;

    // Flags para eliminar imágenes
    const removeProfile = formData.get('removeProfile') === 'true';
    const removeCover = formData.get('removeCover') === 'true';
    if (removeProfile) updatedData.profilePicture = null;
    if (removeCover) updatedData.coverPhoto = null;

    // Imagen de perfil
    const profilePictureFile = formData.get('profilePicture');
    if (profilePictureFile && profilePictureFile.size > 0) {
      if (!ALLOWED_IMAGE_TYPES.has(profilePictureFile.type)) {
        return NextResponse.json({ message: 'Tipo de imagen de perfil no permitido.' }, { status: 415 });
      }
      if (profilePictureFile.size > MAX_IMAGE_BYTES) {
        return NextResponse.json({ message: 'La imagen de perfil es demasiado grande.' }, { status: 413 });
      }
      try {
        const bytes = await profilePictureFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64Image = `data:${profilePictureFile.type};base64,${buffer.toString('base64')}`;
        const result = await cloudinary.uploader.upload(base64Image, {
          folder: 'profile_pictures',
          public_id: `profile-${uuidv4()}`,
          resource_type: 'image',
          quality: 'auto:good',
          fetch_format: 'auto',
          transformation: [{ width: 1600, height: 1600, crop: 'limit' }],
        });
        updatedData.profilePicture = result.secure_url;
      } catch (err) {
        console.error('Cloudinary profile upload error:', err);
        return NextResponse.json({ message: 'No se pudo subir la imagen de perfil.' }, { status: 500 });
      }
    }

    // Portada
    const coverPhotoFile = formData.get('coverPhoto');
    if (coverPhotoFile && coverPhotoFile.size > 0) {
      if (!ALLOWED_IMAGE_TYPES.has(coverPhotoFile.type)) {
        return NextResponse.json({ message: 'Tipo de imagen de portada no permitido.' }, { status: 415 });
      }
      if (coverPhotoFile.size > MAX_IMAGE_BYTES) {
        return NextResponse.json({ message: 'La imagen de portada es demasiado grande.' }, { status: 413 });
      }
      try {
        const bytes = await coverPhotoFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64Image = `data:${coverPhotoFile.type};base64,${buffer.toString('base64')}`;
        const result = await cloudinary.uploader.upload(base64Image, {
          folder: 'cover_photos',
          public_id: `cover-${uuidv4()}`,
          resource_type: 'image',
          quality: 'auto:good',
          fetch_format: 'auto',
          transformation: [{ width: 1920, height: 1080, crop: 'limit' }],
        });
        updatedData.coverPhoto = result.secure_url;
      } catch (err) {
        console.error('Cloudinary cover upload error:', err);
        return NextResponse.json({ message: 'No se pudo subir la imagen de portada.' }, { status: 500 });
      }
    }

    // Actualiza y devuelve sólo campos seguros
    const updatedUser = await User.findByIdAndUpdate(
      id,
      updatedData,
      { new: true, runValidators: true, context: 'query' }
    ).select(PUBLIC_FIELDS);

    if (!updatedUser) {
      return NextResponse.json({ message: 'Usuario no encontrado.' }, { status: 404 });
    }

    return NextResponse.json(
      { message: 'Perfil actualizado con éxito.', user: updatedUser },
      { status: 200 }
    );
  } catch (error) {
    console.error('PATCH /api/users/[id] error:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
