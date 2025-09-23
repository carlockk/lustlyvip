import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema(
    {
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        receiverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        text: {
            type: String,
            required: true,
            trim: true,
        },
        mediaUrl: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

// Aseguramos que el modelo ya no exista antes de compilarlo
const Message = mongoose.models.Message || mongoose.model('Message', MessageSchema);

export default Message;