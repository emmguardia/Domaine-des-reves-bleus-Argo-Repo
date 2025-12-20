import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  image: {
    type: String,
    required: true
  },
  volume: {
    type: String,
    default: null
  },
  fragrance: {
    type: String,
    default: null
  },
  weightGrams: {
    type: Number,
    default: 100
  }
});

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  paymentIntentId: {
    type: String,
    required: true,
    unique: true
  },
  items: [orderItemSchema],
  totalAmount: {
    type: Number,
    required: true
  },
  shippingCost: {
    type: Number,
    required: true,
    default: 0
  },
  shippingAddress: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, default: '' },
    postalCode: { type: String, default: '' },
    country: { type: String, default: 'France' }
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'succeeded', 'failed', 'refunded'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  shippedAt: {
    type: Date,
    default: undefined
  }
}, {
  timestamps: true
});

// Mettre à jour updatedAt avant chaque sauvegarde
orderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index pour améliorer les performances
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ paymentIntentId: 1 });
orderSchema.index({ status: 1 });

const Order = mongoose.model('Order', orderSchema);

export default Order;

