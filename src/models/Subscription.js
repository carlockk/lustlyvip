import { Schema, model, models } from 'mongoose';

const SubscriptionSchema = new Schema({
  subscriberId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El ID del suscriptor es obligatorio.'],
    index: true,
  },
  creatorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El ID del creador es obligatorio.'],
    index: true,
  },
  status: {
    type: String,
    enum: ['active', 'trialing', 'incomplete', 'incomplete_expired', 'past_due', 'canceled', 'unpaid'],
    default: 'active',
  },
  stripeSubscriptionId: {
    type: String,
    default: null,
    index: true,
  },
  priceId: {
    type: String, // price_xxx de Stripe
    default: null,
  },
  currentPeriodEnd: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

const Subscription = models.Subscription || model('Subscription', SubscriptionSchema);

export default Subscription;
