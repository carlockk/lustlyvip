// src/app/api/posts/[id]/route.js

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import Post from '@/models/Post';
import cloudinary from '@/lib/cloudinary';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';

export async function GET(_req, { params }) {
    try {
        await dbConnect();
        const { id } = params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ message: 'ID de publicación no válido.' }, { status: 400 });
        }
        const post = await Post.findById(id)
            .populate('creator', 'username email profilePicture')
            .lean();
        if (!post) {
            return NextResponse.json({ message: 'Publicación no encontrada.' }, { status: 404 });
        }
        // Calcular anterior/siguiente por fecha dentro del mismo creador
        const creatorId = post.creator?._id || post.creator;
        const prev = await Post.findOne({ creator: creatorId, createdAt: { $gt: post.createdAt } })
          .sort({ createdAt: 1 })
          .select('_id imageUrl videoUrl text createdAt')
          .lean();
        const next = await Post.findOne({ creator: creatorId, createdAt: { $lt: post.createdAt } })
          .sort({ createdAt: -1 })
          .select('_id imageUrl videoUrl text createdAt')
          .lean();
        return NextResponse.json({
          post,
          prevId: prev?._id || null,
          nextId: next?._id || null,
          prev: prev || null,
          next: next || null,
        }, { status: 200 });
    } catch (error) {
        console.error('Error al obtener la publicación:', error);
        return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        await dbConnect();
        const session = await auth();
        if (!session) {
            return NextResponse.json({ message: 'No autenticado.' }, { status: 401 });
        }

        const { id } = params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ message: 'ID de publicación no válido.' }, { status: 400 });
        }

        // Buscar la publicación para verificar al creador
        const post = await Post.findById(id);

        if (!post) {
            return NextResponse.json({ message: 'Publicación no encontrada.' }, { status: 404 });
        }

        // Convertir ambos IDs a string para compararlos
        if (post.creator.toString() !== session.user.id.toString()) {
            return NextResponse.json({ message: 'No tienes permiso para borrar esta publicación.' }, { status: 403 });
        }

        // Si la verificación pasa, elimina la publicación
        await Post.findByIdAndDelete(id);

        return NextResponse.json({ message: 'Publicación eliminada con éxito.' }, { status: 200 });
    } catch (error) {
        console.error('Error al eliminar la publicación:', error);
        return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
    }
}

export async function PATCH(req, { params }) {
    try {
        await dbConnect();
        const session = await auth();
        if (!session) {
            return NextResponse.json({ message: 'No autenticado.' }, { status: 401 });
        }

        const { id } = params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ message: 'ID de publicación no válido.' }, { status: 400 });
        }

        const contentType = req.headers.get('content-type') || '';
        let isExclusive, ppvEnabled, ppvAmountCents, ppvCurrency, text;
        let newMediaUrl = null;
        let newMediaIsVideo = false;
        let removeMedia = false;

        if (contentType.includes('multipart/form-data')) {
            const form = await req.formData();
            const media = form.get('media');
            removeMedia = form.get('removeMedia') === 'true';
            const isEx = form.get('isExclusive');
            const ppvEn = form.get('ppvEnabled');
            const ppvAmt = form.get('ppvAmountCents');
            const ppvCur = form.get('ppvCurrency');
            const txt = form.get('text');
            isExclusive = typeof isEx === 'string' ? (isEx === 'true') : undefined;
            ppvEnabled = typeof ppvEn === 'string' ? (ppvEn === 'true') : undefined;
            ppvAmountCents = ppvAmt != null ? parseInt(ppvAmt, 10) : undefined;
            ppvCurrency = typeof ppvCur === 'string' ? ppvCur : undefined;
            text = typeof txt === 'string' ? txt : undefined;

            if (media && media.name) {
                const ALLOWED_MEDIA_TYPES = new Set(['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime']);
                const MAX_MEDIA_BYTES = 32 * 1024 * 1024;
                if (!ALLOWED_MEDIA_TYPES.has(media.type)) {
                    return NextResponse.json({ message: 'Tipo de archivo no permitido.' }, { status: 415 });
                }
                if (media.size > MAX_MEDIA_BYTES) {
                    return NextResponse.json({ message: 'El archivo es demasiado grande.' }, { status: 413 });
                }
                const bytes = await media.arrayBuffer();
                const buffer = Buffer.from(bytes);
                const base64Media = `data:${media.type};base64,${buffer.toString('base64')}`;
                const uploaded = await cloudinary.uploader.upload(base64Media, {
                    resource_type: 'auto',
                    folder: 'posts',
                    public_id: uuidv4(),
                    quality: 'auto:good',
                    fetch_format: 'auto',
                });
                newMediaUrl = uploaded.secure_url;
                newMediaIsVideo = media.type.startsWith('video/');
            }
        } else {
            const body = await req.json();
            ({ isExclusive, ppvEnabled, ppvAmountCents, ppvCurrency, text, removeMedia } = body || {});
        }

        const post = await Post.findById(id);
        if (!post) {
            return NextResponse.json({ message: 'Publicación no encontrada.' }, { status: 404 });
        }

        if (post.creator.toString() !== session.user.id.toString()) {
            return NextResponse.json({ message: 'No tienes permiso para editar esta publicación.' }, { status: 403 });
        }

        if (typeof isExclusive === 'boolean') {
            post.isExclusive = isExclusive;
        }

        if (typeof text === 'string') {
            const t = text.trim();
            if (!post.imageUrl && !post.videoUrl && t.length === 0) {
                return NextResponse.json({ message: 'El texto no puede estar vacío si no hay imagen.' }, { status: 400 });
            }
            if (t.length > 1000) {
                return NextResponse.json({ message: 'El texto no puede superar 1000 caracteres.' }, { status: 400 });
            }
            post.text = t;
        }

        if (removeMedia === true || removeMedia === 'true') {
            post.imageUrl = null;
            post.videoUrl = null;
        }
        if (newMediaUrl) {
            if (newMediaIsVideo) {
                post.videoUrl = newMediaUrl;
                post.imageUrl = null;
            } else {
                post.imageUrl = newMediaUrl;
                post.videoUrl = null;
            }
        }

        if (post.isExclusive && typeof ppvEnabled === 'boolean') {
            post.ppvEnabled = ppvEnabled;
        } else if (!post.isExclusive) {
            post.ppvEnabled = false;
            post.ppvAmountCents = null;
        }

        if (post.isExclusive && post.ppvEnabled) {
            if (ppvAmountCents != null) {
                const parsed = parseInt(ppvAmountCents, 10);
                if (!Number.isFinite(parsed) || parsed <= 0) {
                    return NextResponse.json({ message: 'Precio PPV inválido.' }, { status: 400 });
                }
                const cur = (typeof ppvCurrency === 'string' ? ppvCurrency : post.ppvCurrency || 'usd').toLowerCase();
                if (cur === 'usd' && parsed < 50) {
                    return NextResponse.json({ message: 'El mínimo PPV en USD es 0.50.' }, { status: 400 });
                }
                if (cur === 'clp' && parsed < 500) {
                    return NextResponse.json({ message: 'El mínimo PPV en CLP es 500.' }, { status: 400 });
                }
                post.ppvAmountCents = parsed;
                post.ppvCurrency = cur;
            }
            if (typeof ppvCurrency === 'string') {
                post.ppvCurrency = ppvCurrency.toLowerCase();
            }
        }

        await post.save();
        return NextResponse.json({ message: 'Publicación actualizada', post }, { status: 200 });
    } catch (error) {
        console.error('Error al actualizar la publicación:', error);
        return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
    }
}
