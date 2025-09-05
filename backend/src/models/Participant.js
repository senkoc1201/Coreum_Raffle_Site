const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  // Composite key: raffleId + address
  raffleId: {
    type: String,
    required: true,
    index: true
  },
  address: {
    type: String,
    required: true,
    index: true
  },
  
  // Participation summary
  ticketCount: {
    type: Number,
    required: true,
    default: 0
  },
  totalPaid: {
    type: String, // Store as string for big numbers
    required: true,
    default: '0'
  },
  
  // Timestamps
  firstPurchase: {
    type: Date,
    required: true
  },
  lastPurchase: {
    type: Date,
    required: true
  },
  
  // Payment tracking
  paymentDenom: {
    type: String,
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound unique index
participantSchema.index({ raffleId: 1, address: 1 }, { unique: true });

// Index for efficient queries
participantSchema.index({ raffleId: 1, ticketCount: -1 });
participantSchema.index({ address: 1, firstPurchase: -1 });

module.exports = mongoose.model('Participant', participantSchema);
