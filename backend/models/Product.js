import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Le nom du produit est requis'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'La description est requise'],
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Le prix est requis'],
    min: [0, 'Le prix doit être positif']
  },
  image: {
    type: String,
    required: [true, 'L\'image est requise']
  },
  category: {
    type: String,
    required: [true, 'La catégorie est requise'],
    trim: true
  },
  stock: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'Le stock ne peut pas être négatif']
  },
  weightGrams: {
    type: Number,
    default: 100
  },
  volumes: {
    type: Map,
    of: Number,
    default: undefined
  },
  fragrances: {
    type: Map,
    of: {
      name: String,
      description: String
    },
    default: undefined
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  isNew: {
    type: Boolean,
    default: false
  },
  isPlaceholder: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Mettre à jour updatedAt avant chaque sauvegarde
productSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Méthode pour vérifier si le produit est en rupture de stock
productSchema.methods.isOutOfStock = function() {
  return this.stock === 0;
};

const Product = mongoose.model('Product', productSchema);

export default Product;

