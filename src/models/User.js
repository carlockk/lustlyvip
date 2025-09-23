import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Please provide a username'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters'],
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
        trim: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please provide a valid email address',
        ],
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: [6, 'Password must be at least 6 characters'],
    },
    profilePicture: {
        type: String,
        default: null, // URL de la foto de perfil
    },
    coverPhoto: {
        type: String,
        default: null, // URL de la foto de portada
    },
    bio: { // <-- Campo añadido para la biografía
        type: String,
        default: null,
        maxlength: [500, 'La biografía no puede tener más de 500 caracteres.']
    },
    // Rol del usuario: 'creator' o 'consumer'
    role: {
        type: String,
        enum: ['creator', 'consumer'],
        default: 'consumer',
        index: true,
    },
    stripeCustomerId: {
        type: String,
        default: null,
        index: true,
    },
    // Monetización del creador
    stripeProductId: {
        type: String,
        default: null,
    },
    stripePriceId: {
        type: String,
        default: null,
        index: true,
    },
    // Precios de suscripción adicionales (opcional, para planes múltiples)
    stripePrices: {
        type: new mongoose.Schema({
            day_1: { type: String, default: null },        // price_xxx (diario)
            week_1: { type: String, default: null },      // price_xxx (semanal)
            month_1: { type: String, default: null },     // price_xxx (mensual)
            month_3: { type: String, default: null },     // price_xxx (trimestral)
            month_6: { type: String, default: null },     // price_xxx (semestral)
            year_1: { type: String, default: null },      // price_xxx (anual)
        }, { _id: false }),
        default: undefined,
    },
    // Descuentos introductorios (solo primera factura) por plan
    stripeIntroPercents: {
        type: new mongoose.Schema({
            day_1: { type: Number, default: 0, min: 0, max: 100 },
            week_1: { type: Number, default: 0, min: 0, max: 100 },
            month_1: { type: Number, default: 0, min: 0, max: 100 },
            month_3: { type: Number, default: 0, min: 0, max: 100 },
            month_6: { type: Number, default: 0, min: 0, max: 100 },
            year_1: { type: Number, default: 0, min: 0, max: 100 },
        }, { _id: false }),
        default: undefined,
    },
    // Cupones de Stripe (duration: 'once') para aplicar el descuento introductorio por plan
    stripeCoupons: {
        type: new mongoose.Schema({
            day_1: { type: String, default: null },
            week_1: { type: String, default: null },
            month_1: { type: String, default: null },
            month_3: { type: String, default: null },
            month_6: { type: String, default: null },
            year_1: { type: String, default: null },
        }, { _id: false }),
        default: undefined,
    },
    // Stripe Connect (para pagos directos al creador)
    stripeConnectId: {
        type: String,
        default: null,
        index: true,
    },
    stripeConnectChargesEnabled: {
        type: Boolean,
        default: false,
    },
    // Favoritos: lista de creadores seguidos/favoritos
    favorites: [
        { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }
    ],
});

// Esta línea es crucial para evitar errores de recompilación en Next.js.
// Reutiliza el modelo si ya existe.
export default mongoose.models.User || mongoose.model('User', UserSchema);
