// src/app/api/subscriptions/route.js

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import Subscription from '@/models/Subscription';
import mongoose from 'mongoose';

// API para suscribir o cancelar la suscripción (POST)
export async function POST(req) {
    try {
        console.log('--- Iniciando solicitud POST para suscripción ---');
        await dbConnect();
        const session = await auth();
        if (!session) {
            console.log('POST: Usuario no autenticado.');
            return NextResponse.json({ message: 'No autenticado.' }, { status: 401 });
        }
        
        const { creatorId } = await req.json();
        console.log(`POST: Datos recibidos - creatorId: ${creatorId}, subscriberId: ${session.user.id}`);

        if (!mongoose.Types.ObjectId.isValid(creatorId)) {
            console.log('POST: ID de creador no válido.');
            return NextResponse.json({ message: 'ID de creador no válido.' }, { status: 400 });
        }
        
        const subscriberId = new mongoose.Types.ObjectId(session.user.id);
        const creatorObjectId = new mongoose.Types.ObjectId(creatorId);

        if (subscriberId.equals(creatorObjectId)) {
            console.log('POST: Intento de suscribirse a uno mismo.');
            return NextResponse.json({ message: 'No puedes suscribirte a ti mismo.' }, { status: 400 });
        }
        
        const existingSubscription = await Subscription.findOne({
            subscriberId: subscriberId,
            creatorId: creatorObjectId,
        });
        
        if (existingSubscription) {
            await Subscription.findByIdAndDelete(existingSubscription._id);
            console.log(`POST: Suscripción a ${creatorId} cancelada. Documento eliminado.`);
            // Devuelve false para que el frontend sepa que ahora NO está suscrito
            return NextResponse.json({ message: 'Suscripción cancelada.', isSubscribed: false }, { status: 200 });
        } else {
            const newSubscription = await Subscription.create({
                subscriberId: subscriberId,
                creatorId: creatorObjectId,
            });
            console.log(`POST: Suscripción a ${creatorId} exitosa. Documento creado con ID: ${newSubscription._id}`);
            // Devuelve true para que el frontend sepa que ahora SÍ está suscrito
            return NextResponse.json({ message: 'Suscripción exitosa.', isSubscribed: true }, { status: 201 });
        }
    } catch (error) {
        console.error('POST: Error al manejar la suscripción:', error);
        return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
    }
}

// API para verificar si un usuario está suscrito a un creador o para obtener todas las suscripciones (GET)
export async function GET(req) {
    try {
        console.log('--- Iniciando solicitud GET para suscripciones ---');
        await dbConnect();
        const session = await auth();

        if (!session) {
            console.log('GET: Usuario no autenticado.');
            return NextResponse.json({ message: 'No autenticado.' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const creatorId = searchParams.get('creatorId');
        const userId = session.user.id;
        
        // Lógica para verificar una suscripción específica
        if (creatorId) {
            console.log(`GET: Verificando suscripción para el creador ID: ${creatorId}`);
            if (!mongoose.Types.ObjectId.isValid(creatorId)) {
                return NextResponse.json({ message: 'ID de creador no válido.' }, { status: 400 });
            }
            const subscription = await Subscription.findOne({
                subscriberId: new mongoose.Types.ObjectId(userId),
                creatorId: new mongoose.Types.ObjectId(creatorId),
            });
            console.log(`GET: Resultado de la verificación - isSubscribed: ${!!subscription}`);
            return NextResponse.json({ isSubscribed: !!subscription, mode: subscription ? (subscription.stripeSubscriptionId ? 'stripe' : 'free') : null }, { status: 200 });
        } else {
            // Lógica para obtener todas las suscripciones del usuario
            console.log(`GET: Obteniendo todas las suscripciones para el usuario ID: ${userId}`);
            const subscriptions = await Subscription.find({ subscriberId: userId })
                .populate('creatorId', 'username profilePicture coverPhoto');
            console.log(`GET: Se encontraron ${subscriptions.length} suscripciones.`);
            return NextResponse.json({ subscriptions }, { status: 200 });
        }
        
    } catch (error) {
        console.error('GET: Error al verificar/obtener las suscripciones:', error);
        return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
    }
}
