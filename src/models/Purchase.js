import { Schema, model, models } from 'mongoose';

const PurchaseSchema = new Schema({
  buyerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
  amount: { type: Number, required: true }, // en menores unidades (centavos)
  currency: { type: String, default: 'usd' },
  stripePaymentIntentId: { type: String, default: null, index: true },
  status: { type: String, enum: ['succeeded', 'processing', 'requires_payment_method', 'canceled'], default: 'succeeded' },
  platformFeeCents: { type: Number, default: 0 },
  creatorNetCents: { type: Number, default: 0 },
}, { timestamps: true });

const Purchase = models.Purchase || model('Purchase', PurchaseSchema);

export default Purchase;
