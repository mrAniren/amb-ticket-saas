const mongoose = require('mongoose');

const facebookConfigSchema = new mongoose.Schema({
  pixelId: {
    type: String,
    required: true,
    trim: true
  },
  accessToken: {
    type: String,
    required: true,
    trim: true
  },
  testEventCode: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  events: {
    viewContent: { type: Boolean, default: true },
    addToCart: { type: Boolean, default: true },
    initiateCheckout: { type: Boolean, default: true },
    purchase: { type: Boolean, default: true }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

facebookConfigSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('FacebookConfig', facebookConfigSchema);
