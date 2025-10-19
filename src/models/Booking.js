const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingReference: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  flightDetails: {
    origin: String,
    destination: String,
    departureDate: Date,
    returnDate: Date,
    airline: String,
    flightNumber: String,
    class: String,
    duration: String
  },
  passengers: [{
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    dateOfBirth: Date,
    passportNumber: String,
    passportExpiry: Date,
    nationality: String
  }],
  pricing: {
    basePrice: { type: Number, required: true },
    taxes: Number,
    fees: Number,
    total: { type: Number, required: true },
    currency: { type: String, default: 'NGN' }
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentId: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Booking', bookingSchema);