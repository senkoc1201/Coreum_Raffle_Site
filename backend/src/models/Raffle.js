const mongoose = require('mongoose');

const raffleSchema = new mongoose.Schema({
  // Smart contract raffle ID (auto-incremented by contract)
  raffleId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Raffle creator
  creator: {
    type: String,
    required: true,
    index: true
  },
  
  // NFT details
  cw721Address: {
    type: String,
    required: true
  },
  tokenId: {
    type: String,
    required: true
  },
  
  // Optional off-chain metadata supplied by frontend after creation
  description: {
    type: String
  },
  
  // Raffle configuration
  ticketPrice: {
    type: String, // Store as string to handle big numbers
    required: true
  },
  maxTickets: {
    type: Number,
    required: true
  },
  totalSold: {
    type: Number,
    default: 0,
    index: true
  },
  
  // Timing
  startTime: {
    type: Date,
    required: true,
    index: true
  },
  endTime: {
    type: Date,
    required: true,
    index: true
  },
  
  // Payment details
  paymentType: {
    type: String,
    enum: ['native', 'cw20'],
    required: true
  },
  paymentDenom: {
    type: String // For native tokens (e.g., 'ucore')
  },
  paymentCw20: {
    type: String // For CW20 tokens (contract address)
  },
  
  // Revenue address (where proceeds go)
  revenueAddress: {
    type: String,
    required: true
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active',
    index: true
  },
  
  // Winner details (set when raffle ends)
  winner: {
    type: String,
    index: true
  },
  winnerTicketIndex: {
    type: Number
  },
  
  // Randomness details
  drandRound: {
    type: String
  },
  endReason: {
    type: String,
    enum: ['time', 'soldout']
  },
  
  // Blockchain tracking
  createdAtHeight: {
    type: Number,
    index: true
  },
  endedAtHeight: {
    type: Number
  },
  
  // Transaction hashes
  createTxHash: {
    type: String,
    index: true
  },
  endTxHash: {
    type: String
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for checking if raffle has ended by time
raffleSchema.virtual('isExpired').get(function() {
  return new Date() > this.endTime;
});

// Virtual for checking if raffle is sold out
raffleSchema.virtual('isSoldOut').get(function() {
  return this.totalSold >= this.maxTickets;
});

// Virtual for checking if raffle can be ended
raffleSchema.virtual('canEnd').get(function() {
  return this.status === 'active' && (this.isExpired || this.isSoldOut) && this.totalSold > 0;
});

// Indexes for efficient queries
raffleSchema.index({ status: 1, endTime: 1 });
raffleSchema.index({ status: 1, totalSold: 1, maxTickets: 1 });
raffleSchema.index({ creator: 1, status: 1 });
raffleSchema.index({ createdAtHeight: 1 });

module.exports = mongoose.model('Raffle', raffleSchema);