import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import cloudinary from '@/lib/cloudinary';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

// GET: Obtener los datos de un usuario por su ID
export async function GET(req, { params }) {
    try {
        await dbConnect();
        const { id } = params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ message: 'ID de usuario no válido.' }, { status: 400 });
        }

        // Buscar el usuario por ID, pero solo devolver datos públicos
        const user = await User.findById(id).select('-password -email');

        if (!user) {
            return NextResponse.json({ message: 'Usuario no encontrado.' }, { status: 404 });
        }

        return NextResponse.json({ user }, { status: 200 });

    } catch (error) {
        console.error('Error al obtener el usuario:', error);
        return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
    }
}

// PATCH: Actualizar el perfil de un usuario
export async function PATCH(req, { params }) {
    try {
        await dbConnect();
        const session = await auth();
        if (!session) {
            return NextResponse.json({ message: 'No autenticado.' }, { status: 401 });
        }
        
        const { id } = params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ message: 'ID de usuario no válido.' }, { status: 400 });
        }
        if (session.user.id !== id) {
            return NextResponse.json({ message: 'No tienes permiso para editar este perfil.' }, { status: 403 });
        }

        const formData = await req.formData();
        const updatedData = {};

        const username = formData.get('username');
        if (username) updatedData.username = username;

        const email = formData.get('email');
        if (email) updatedData.email = email;

        const bio = formData.get('bio');
        if (bio) updatedData.bio = bio;

        const profilePictureFile = formData.get('profilePicture');
        if (profilePictureFile && profilePictureFile.size > 0) {
            if (!ALLOWED_IMAGE_TYPES.has(profilePictureFile.type)) {
                return NextResponse.json({ message: 'Tipo de imagen no permitido.' }, { status: 415 });
            }
            if (profilePictureFile.size > MAX_IMAGE_BYTES) {
                return NextResponse.json({ message: 'La imagen de perfil es demasiado grande.' }, { status: 413 });
            }
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
        }

        const coverPhotoFile = formData.get('coverPhoto');
        if (coverPhotoFile && coverPhotoFile.size > 0) {
            if (!ALLOWED_IMAGE_TYPES.has(coverPhotoFile.type)) {
                return NextResponse.json({ message: 'Tipo de imagen no permitido.' }, { status: 415 });
            }
            if (coverPhotoFile.size > MAX_IMAGE_BYTES) {
                return NextResponse.json({ message: 'La imagen de portada es demasiado grande.' }, { status: 413 });
            }
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
        }

        const updatedUser = await User.findByIdAndUpdate(
            id,
            updatedData,
            { new: true, runValidators: true, context: 'query' }
        );

        if (!updatedUser) {
            return NextResponse.json({ message: 'Usuario no encontrado.' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Perfil actualizado con éxito.', user: updatedUser }, { status: 200 });

    } catch (error) {
        console.error('Error al actualizar el perfil:', error);
        return NextResponse.json({ message: 'Error interno del servidor.', error: error.message }, { status: 500 });
    }
}
