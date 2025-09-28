import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import Message from '@/models/Message';
import User from '@/models/User';
import Subscription from '@/models/Subscription';
import mongoose from 'mongoose';

const STATUS_ALLOWED = ['active', 'trialing', 'past_due'];
const MONETIZATION_KEYS = ['day_1', 'week_1', 'month_1', 'month_3', 'month_6', 'year_1'];
const BANNED_SINGLE_WORDS = [
  'puta', 'puto', 'putita', 'mierda', 'imbecil', 'idiota', 'estupido', 'estúpido', 'tarado', 'pendejo',
  'culiao', 'culero', 'conchetumare', 'conchesumadre', 'maricon', 'maricón', 'perra', 'perro', 'malparido',
  'bitch', 'shit', 'fuck', 'asshole', 'motherfucker', 'slut', 'whore', 'bastard', 'retard', 'faggot', 'nazi', 'hitler',
];
const BANNED_PHRASES = [
  'hijo de puta',
  'hijodeputa',
  'negro de mierda',
  'vete al infierno',
  'maldito seas',
  'fuck you',
];

const removeDiacritics = (value = '') => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const containsBannedLanguage = (text = '') => {
  const sanitized = removeDiacritics(text).toLowerCase();
  const tokenized = sanitized.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  if (tokenized.some((token) => BANNED_SINGLE_WORDS.includes(token))) return true;
  return BANNED_PHRASES.some((phrase) => sanitized.includes(removeDiacritics(phrase).toLowerCase()));
};

const toObjectId = (value) => {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  try {
    return new mongoose.Types.ObjectId(value);
  } catch {
    return null;
  }
};

const hasActiveMonetization = (user) => {
  if (!user || user.monetizationEnabled === false) return false;
  const prices = user.stripePrices || {};
  return Boolean(user.stripePriceId || MONETIZATION_KEYS.some((key) => prices?.[key]));
};

const isCreatorUser = (user) => {
  if (!user) return false;
  return user.role === 'creator' || hasActiveMonetization(user);
};

const validateMessagingAccess = async (meId, otherId) => {
  const meObjectId = toObjectId(meId);
  const otherObjectId = toObjectId(otherId);
  if (!meObjectId || !otherObjectId) {
    return { allowed: false, reason: 'ID inválido.' };
  }

  const [meUser, otherUser] = await Promise.all([
    User.findById(meObjectId).select('role stripePriceId stripePrices monetizationEnabled').lean(),
    User.findById(otherObjectId).select('role stripePriceId stripePrices monetizationEnabled').lean(),
  ]);

  if (!meUser || !otherUser) {
    return { allowed: false, reason: 'Usuario no encontrado.' };
  }

  const meIsCreator = isCreatorUser(meUser);
  const otherIsCreator = isCreatorUser(otherUser);
  const otherMonetized = hasActiveMonetization(otherUser);
  const meMonetized = hasActiveMonetization(meUser);

  if (otherIsCreator) {
    const sub = await Subscription.findOne({
      subscriberId: meObjectId,
      creatorId: otherObjectId,
      status: { $in: STATUS_ALLOWED },
    }).lean();
    if (!sub) {
      return { allowed: false, reason: 'Debes suscribirte para enviar mensajes a este creador.' };
    }
    if (otherMonetized && !sub.stripeSubscriptionId) {
      return { allowed: false, reason: 'Necesitas una suscripción pagada para chatear con este creador.' };
    }
    return { allowed: true };
  }

  if (meIsCreator) {
    const sub = await Subscription.findOne({
      subscriberId: otherObjectId,
      creatorId: meObjectId,
      status: { $in: STATUS_ALLOWED },
    }).lean();
    if (!sub) {
      return { allowed: false, reason: 'Solo puedes chatear con tus suscriptores.' };
    }
    if (meMonetized && !sub.stripeSubscriptionId) {
      return { allowed: false, reason: 'Los mensajes están disponibles solo para suscriptores pagados.' };
    }
    return { allowed: true };
  }

  const sub = await Subscription.findOne({
    subscriberId: meObjectId,
    creatorId: otherObjectId,
    status: { $in: STATUS_ALLOWED },
  }).lean();
  if (sub) return { allowed: true };

  const reverse = await Subscription.findOne({
    subscriberId: otherObjectId,
    creatorId: meObjectId,
    status: { $in: STATUS_ALLOWED },
  }).lean();
  if (reverse) return { allowed: true };

  return { allowed: false, reason: 'Necesitas una relación de suscripción para conversar.' };
};

export async function GET(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: 'No autenticado.' }, { status: 401 });
    }

    const userId = session.user.id;
    const meObjectId = toObjectId(userId);
    if (!meObjectId) {
      return NextResponse.json({ message: 'ID de usuario inválido.' }, { status: 400 });
    }

    const url = new URL(req.url);
    const otherUserId = url.searchParams.get('userId');

    if (otherUserId) {
      const otherObjectId = toObjectId(otherUserId);
      if (!otherObjectId) {
        return NextResponse.json({ message: 'ID de usuario inválido.' }, { status: 400 });
      }

      const access = await validateMessagingAccess(meObjectId, otherObjectId);
      if (!access.allowed) {
        return NextResponse.json({ message: access.reason || 'No tienes permiso para ver esta conversación.' }, { status: 403 });
      }

      const messages = await Message.find({
        $or: [
          { senderId: meObjectId, receiverId: otherObjectId },
          { senderId: otherObjectId, receiverId: meObjectId },
        ],
      }).sort({ createdAt: 1 });

      return NextResponse.json({ messages }, { status: 200 });
    }

    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { senderId: meObjectId },
            { receiverId: meObjectId },
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
              { $eq: ['$senderId', meObjectId] },
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

    const filtered = [];
    for (const convo of conversations) {
      const otherId = convo?.otherUser?._id;
      if (!otherId) continue;
      try {
        const access = await validateMessagingAccess(meObjectId, otherId);
        if (access.allowed) filtered.push(convo);
      } catch (err) {
        console.error('GET: conversación descartada por permisos', err);
      }
    }

    return NextResponse.json({ conversations: filtered }, { status: 200 });
  } catch (error) {
    console.error('GET: Error al verificar/obtener las suscripciones:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}

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

    const receiverObjectId = toObjectId(receiverId);
    const senderObjectId = toObjectId(senderId);
    if (!receiverObjectId || !senderObjectId) {
      return NextResponse.json({ message: 'ID de usuario inválido.' }, { status: 400 });
    }

    const trimmed = String(text).trim();
    if (trimmed.length === 0 || trimmed.length > 1000) {
      return NextResponse.json({ message: 'El mensaje debe tener entre 1 y 1000 caracteres.' }, { status: 400 });
    }

    if (containsBannedLanguage(trimmed)) {
      return NextResponse.json({ message: 'El mensaje contiene lenguaje inapropiado.' }, { status: 400 });
    }

    const access = await validateMessagingAccess(senderObjectId, receiverObjectId);
    if (!access.allowed) {
      return NextResponse.json({ message: access.reason || 'No tienes permiso para enviar mensajes.' }, { status: 403 });
    }

    const newMessage = await Message.create({
      senderId: senderObjectId,
      receiverId: receiverObjectId,
      text: trimmed,
    });

    return NextResponse.json({ message: newMessage }, { status: 201 });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
