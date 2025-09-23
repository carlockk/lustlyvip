import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import Post from '@/models/Post';
import mongoose from 'mongoose';

export async function POST(req) {
  try {
    await dbConnect();

    // Obtenemos la sesión del usuario
    const session = await auth();
    if (!session) {
      return NextResponse.json({ message: 'No autenticado.' }, { status: 401 });
    }

    const { postId } = await req.json();

    // Verificamos si el postId es válido
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return NextResponse.json({ message: 'ID de publicación no válido.' }, { status: 400 });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return NextResponse.json({ message: 'Publicación no encontrada.' }, { status: 404 });
    }

    // Convertimos el ID de la sesión a ObjectId para la búsqueda
    const userId = new mongoose.Types.ObjectId(session.user.id);

    // Verificamos si el usuario ya dio like (comparación robusta)
    const hasLiked = (post.likes || []).some((id) => {
      try { return String(id) === String(userId); } catch { return false; }
    });

    let updatedPost;
    if (hasLiked) {
      // Si ya dio like, lo eliminamos
      updatedPost = await Post.findByIdAndUpdate(
        postId,
        { $pull: { likes: userId } },
        { new: true } // Devolvemos el documento actualizado
      );
    } else {
      // Si no ha dado like, lo agregamos
      updatedPost = await Post.findByIdAndUpdate(
        postId,
        { $push: { likes: userId } },
        { new: true }
      );
    }

    return NextResponse.json({ post: updatedPost }, { status: 200 });

  } catch (error) {
    console.error('Error al manejar el like:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
