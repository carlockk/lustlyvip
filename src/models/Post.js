// src/models/Post.js

import mongoose from 'mongoose';

const PostSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true,
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    isExclusive: {
        type: Boolean,
        default: false,
    },
    // Configuración PPV (pago por ver) por post
    ppvEnabled: {
        type: Boolean,
        default: false,
    },
    ppvAmountCents: {
        type: Number, // precio en la menor unidad (centavos)
        default: null,
        min: 1,
    },
    ppvCurrency: {
        type: String,
        default: 'usd',
        lowercase: true,
        trim: true,
    },
    // Media: soporta imagen o video
    imageUrl: {
        type: String,
        default: null,
    },
    videoUrl: {
        type: String,
        default: null,
    },
    likes: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    ],
    createdAt: {
        type: Date,
        default: Date.now,
        index: true,
    },
});

const Post = mongoose.models.Post || mongoose.model('Post', PostSchema);

export default Post;
