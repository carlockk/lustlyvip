import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import Message from '@/models/Message';
import User from '@/models/User';
import mongoose from 'mongoose'; // <-- Asegúrate de que esta línea esté aquí

// API para obtener conversaciones y mensajes
export async function GET(req) {
    try {
        await dbConnect();
        const session = await auth();
        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ message: 'No autenticado.' }, { status: 401 });
        }
        
        const userId = session.user.id;
        const url = new URL(req.url);
        const otherUserId = url.searchParams.get('userId');

        // Si se proporciona un 'userId', devuelve los mensajes de esa conversación
        if (otherUserId) {
            if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
                return NextResponse.json({ message: 'ID de usuario inválido.' }, { status: 400 });
            }
            const me = new mongoose.Types.ObjectId(userId);
            const other = new mongoose.Types.ObjectId(otherUserId);
            const messages = await Message.find({
                $or: [
                    { senderId: me, receiverId: other },
                    { senderId: other, receiverId: me },
                ],
            }).sort({ createdAt: 1 });

            return NextResponse.json({ messages }, { status: 200 });
        }

        // Si no se proporciona 'userId', devuelve la lista de conversaciones
        const conversations = await Message.aggregate([
            {
                $match: {
                    $or: [
                        { senderId: new mongoose.Types.ObjectId(userId) },
                        { receiverId: new mongoose.Types.ObjectId(userId) },
                    ],
                },
            },
            {
                $sort: { createdAt: -1 },
            },
            {
                $group: {
                    _id: {
                        $cond: [
                            { $eq: ['$senderId', new mongoose.Types.ObjectId(userId)] },
                            '$receiverId',
                            '$senderId',
                        ],
                    },
                    lastMessage: { $first: '$$ROOT' },
                },
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'otherUser',
                },
            },
            {
                $unwind: '$otherUser',
            },
            {
                $project: {
                    _id: 0,
                    lastMessage: '$lastMessage',
                    otherUser: {
                        _id: '$otherUser._id',
                        username: '$otherUser.username',
                        profilePicture: '$otherUser.profilePicture',
                    },
                },
            },
        ]);

        return NextResponse.json({ conversations }, { status: 200 });
    } catch (error) {
        console.error('Error fetching messages:', error);
        return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
    }
}

// API para enviar un nuevo mensaje
export async function POST(req) {
    try {
        await dbConnect();
        const session = await auth();
        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ message: 'No autenticado.' }, { status: 401 });
        }

        const { receiverId, text } = await req.json();
        const senderId = session.user.id;

        if (!receiverId || !text) {
            return NextResponse.json({ message: 'Faltan datos en la solicitud.' }, { status: 400 });
        }
        if (!mongoose.Types.ObjectId.isValid(receiverId)) {
            return NextResponse.json({ message: 'ID de usuario inválido.' }, { status: 400 });
        }
        const trimmed = String(text).trim();
        if (trimmed.length === 0 || trimmed.length > 1000) {
            return NextResponse.json({ message: 'El mensaje debe tener entre 1 y 1000 caracteres.' }, { status: 400 });
        }

        const newMessage = await Message.create({
            senderId: new mongoose.Types.ObjectId(senderId),
            receiverId: new mongoose.Types.ObjectId(receiverId),
            text: trimmed,
        });

        return NextResponse.json({ message: 'Mensaje enviado con éxito.', message: newMessage }, { status: 201 });
    } catch (error) {
        console.error('Error sending message:', error);
        return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
    }
}
