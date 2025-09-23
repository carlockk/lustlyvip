import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Post from '@/models/Post';
import User from '@/models/User';
import mongoose from 'mongoose';

export async function GET(req, { params }) {
    try {
        await dbConnect();

        // **Corrección del error:** Acceso directo a 'params.id'
        const id = params.id;
        const url = new URL(req.url);
        const contentType = url.searchParams.get('type');
        const limit = Math.max(1, Math.min(parseInt(url.searchParams.get('limit') || '20', 10) || 20, 50));
        const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10) || 0);

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ message: 'ID de usuario no válido.' }, { status: 400 });
        }

        const user = await User.findById(id).lean();
        if (!user) {
            return NextResponse.json({ message: 'Usuario no encontrado.' }, { status: 404 });
        }

        let postFilter = { creator: id };

        if (contentType === 'media') {
            postFilter.$or = [
                { imageUrl: { $ne: null } },
                { videoUrl: { $ne: null } }
            ];
        }

        const posts = await Post.find(postFilter)
            .populate('creator')
            .sort({ createdAt: -1 })
            .skip(offset)
            .limit(limit)
            .lean();
            
        user._id = user._id.toString();
        if (user.profilePicture) user.profilePicture = user.profilePicture.toString();
        if (user.coverPhoto) user.coverPhoto = user.coverPhoto.toString();

        posts.forEach(post => {
            post._id = post._id.toString();
            if (post.creator && post.creator._id) { 
                post.creator._id = post.creator._id.toString();
            }
        });

        return NextResponse.json({ user, posts }, { status: 200 });

    } catch (error) {
        console.error('Error al obtener el perfil:', error);
        return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
    }
}
