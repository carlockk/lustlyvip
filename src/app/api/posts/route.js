import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import Post from '@/models/Post';
import Subscription from '@/models/Subscription';
import cloudinary from '@/lib/cloudinary';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_MEDIA_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']);
const MAX_MEDIA_BYTES = 32 * 1024 * 1024; // 32MB

// API para crear una nueva publicación (POST)
export async function POST(req) {
    try {
        await dbConnect();
        const session = await auth();
        if (!session) {
            return NextResponse.json({ message: 'No autenticado.' }, { status: 401 });
        }

        const formData = await req.formData();
        const text = formData.get('text');
        const isExclusive = formData.get('isExclusive') === 'true';
        const ppvEnabled = formData.get('ppvEnabled') === 'true';
        const ppvAmountCentsRaw = formData.get('ppvAmountCents');
        const ppvCurrencyRaw = formData.get('ppvCurrency');
        const mediaFile = formData.get('media');

        if (!text && !mediaFile) {
            return NextResponse.json({ message: 'El contenido de la publicación o un archivo multimedia es obligatorio.' }, { status: 400 });
        }

        let imageUrl = null;
        let videoUrl = null;
        if (mediaFile) {
            if (!ALLOWED_MEDIA_TYPES.has(mediaFile.type)) {
                return NextResponse.json({ message: 'Tipo de archivo no permitido.' }, { status: 415 });
            }
            if (mediaFile.size > MAX_MEDIA_BYTES) {
                return NextResponse.json({ message: 'El archivo es demasiado grande.' }, { status: 413 });
            }
            const bytes = await mediaFile.arrayBuffer();
            const buffer = Buffer.from(bytes);
            const base64Media = `data:${mediaFile.type};base64,${buffer.toString('base64')}`;
            const result = await cloudinary.uploader.upload(base64Media, {
                resource_type: 'auto',
                folder: 'posts',
                public_id: uuidv4(),
                quality: 'auto:good',
                fetch_format: 'auto',
            });
            if (mediaFile.type.startsWith('video/')) {
                videoUrl = result.secure_url;
            } else {
                imageUrl = result.secure_url;
            }
        }

        const textValue = typeof text === 'string' ? text.trim() : '';
        if (!imageUrl && !videoUrl && (textValue.length === 0 || textValue.length > 1000)) {
            return NextResponse.json({ message: 'El texto debe tener entre 1 y 1000 caracteres.' }, { status: 400 });
        }

        // Validaciones PPV
        let ppvAmountCents = null;
        let ppvCurrency = 'usd';
        if (isExclusive && ppvEnabled) {
            const parsed = parseInt(ppvAmountCentsRaw, 10);
            if (!Number.isFinite(parsed) || parsed <= 0) {
                return NextResponse.json({ message: 'Precio PPV inválido.' }, { status: 400 });
            }
            // Reglas mínimas por moneda (simplificadas para test)
            const cur = (typeof ppvCurrencyRaw === 'string' ? ppvCurrencyRaw : 'usd').toLowerCase();
            if (cur === 'usd' && parsed < 50) {
                return NextResponse.json({ message: 'El mínimo PPV en USD es 0.50.' }, { status: 400 });
            }
            if (cur === 'clp' && parsed < 500) {
                return NextResponse.json({ message: 'El mínimo PPV en CLP es 500.' }, { status: 400 });
            }
            ppvAmountCents = parsed;
            ppvCurrency = cur;
        }

        const newPost = await Post.create({
            text: textValue,
            isExclusive,
            creator: session.user.id,
            imageUrl: imageUrl,
            videoUrl: videoUrl,
            ppvEnabled: !!(isExclusive && ppvEnabled),
            ppvAmountCents: ppvAmountCents,
            ppvCurrency: ppvCurrency,
        });

        return NextResponse.json({ message: 'Publicación creada con éxito.', post: newPost }, { status: 201 });
    } catch (error) {
        console.error('Error al crear la publicación:', error);
        return NextResponse.json({ message: 'Error interno del servidor.', error: error.message }, { status: 500 });
    }
}

// API para obtener todas las publicaciones (GET)
export async function GET() {
    try {
        await dbConnect();
        const session = await auth();
        const userId = session?.user?.id;

        const posts = await Post.find({})
            // Se añaden 'profilePicture' y 'imageUrl' a la consulta
            .populate('creator', 'username email profilePicture')
            .sort({ createdAt: -1 })
            .lean();

        const visiblePosts = await Promise.all(
            posts.map(async (post) => {
                if (!post || !post.creator) {
                    return null;
                }
                
                const creatorId = post.creator._id.toString();

                if (!post.isExclusive) {
                    // Incluimos la media de la publicación para posts no exclusivos
                    return { ...post, imageUrl: post.imageUrl, videoUrl: post.videoUrl };
                }

                if (userId && creatorId === userId) {
                    return { ...post, imageUrl: post.imageUrl, videoUrl: post.videoUrl };
                }

                if (userId) {
                    const isSubscribed = await Subscription.exists({
                        subscriberId: userId,
                        creatorId: creatorId,
                    });
                    if (isSubscribed) {
                        return { ...post, imageUrl: post.imageUrl, videoUrl: post.videoUrl };
                    }
                }

                return null;
            })
        );

        const filteredPosts = visiblePosts.filter(post => post !== null);

        return NextResponse.json({ posts: filteredPosts }, { status: 200 });
    } catch (error) {
        console.error('Error al obtener las publicaciones:', error);
        return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
    }
}
