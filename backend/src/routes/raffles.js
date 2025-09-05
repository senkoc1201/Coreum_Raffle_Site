const express = require('express');
const router = express.Router();
const Raffle = require('../models/Raffle');
const Participant = require('../models/Participant');
const raffleContractService = require('../services/raffle-contract');
const logger = require('../config/logger');

// POST /api/raffles/:id/metadata - Upsert off-chain metadata (e.g., description)
router.post('/:id/metadata', async (req, res) => {
  try {
    const { id } = req.params;
    const { description } = req.body || {};

    if (typeof description !== 'string') {
      return res.status(400).json({ error: 'description must be a string' });
    }

    const updated = await Raffle.findOneAndUpdate(
      { raffleId: id },
      { $set: { description } },
      { new: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({ error: 'Raffle not found' });
    }

    res.json(updated);
  } catch (error) {
    logger.error(`Error updating raffle ${id} metadata:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/raffles - Get raffles with live blockchain sync
router.get('/', async (req, res) => {
  try {
    const { 
      status, 
      creator, 
      page = 1, 
      limit = 100, 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = req.query;
    
    logger.info(`Fetching raffles with filters: status=${status}, creator=${creator}`);
    
    // First, sync latest data from blockchain
    await syncRafflesFromBlockchain();
    
    // Build filter
    const filter = {};
    if (status) {
      if (Array.isArray(status)) {
        filter.status = { $in: status };
      } else {
        filter.status = status;
      }
    }
    if (creator) {
      filter.creator = creator;
    }
    
    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const raffles = await Raffle.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    // Get total count for pagination
    const total = await Raffle.countDocuments(filter);
    
    logger.info(`Found ${raffles.length} raffles (${total} total)`);
    
    res.json({
      data: raffles,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    logger.error('Error fetching raffles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/raffles/status/:status - Get raffles by status
router.get('/status/:status', async (req, res) => {
  try {
    const { status } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    logger.info(`Fetching raffles with status: ${status}`);
    
    // Sync latest data from blockchain
    await syncRafflesFromBlockchain();
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const raffles = await Raffle.find({ status })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    const total = await Raffle.countDocuments({ status });
    
    logger.info(`Found ${raffles.length} ${status} raffles`);
    
    res.json({
      data: raffles,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    logger.error(`Error fetching ${status} raffles:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/raffles/:id - Get specific raffle with live sync
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    logger.info(`Fetching raffle ${id}`);
    
    // Sync this specific raffle from blockchain
    await syncSpecificRaffleFromBlockchain(parseInt(id));
    
    const raffle = await Raffle.findOne({ raffleId: id }).lean();
    if (!raffle) {
      return res.status(404).json({ error: 'Raffle not found' });
    }
    
    logger.info(`Found raffle ${id}: ${raffle.tokenId}`);
    res.json(raffle);
    
  } catch (error) {
    logger.error(`Error fetching raffle ${id}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/raffles/:id/participants - Get raffle participants with live sync
router.get('/:id/participants', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    logger.info(`Fetching participants for raffle ${id}`);
    
    // Sync participants from blockchain
    await syncRaffleParticipantsFromBlockchain(parseInt(id));
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const participants = await Participant.find({ raffleId: id })
      .sort({ firstPurchase: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    const total = await Participant.countDocuments({ raffleId: id });
    
    logger.info(`Found ${participants.length} participants for raffle ${id}`);
    
    res.json({
      data: participants,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    logger.error(`Error fetching participants for raffle ${id}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sync functions using contract service
async function syncRafflesFromBlockchain() {
  try {
    logger.debug('🔄 Syncing raffles from blockchain...');
    const contractResult = await raffleContractService.getAllRaffles();
    
    for (const contractRaffle of contractResult.raffles || []) {
      await upsertRaffleFromContract(contractRaffle);
    }
    
    logger.debug(`✅ Synced ${contractResult.raffles?.length || 0} raffles`);
  } catch (error) {
    logger.error('❌ Failed to sync raffles from blockchain:', error);
  }
}

async function syncSpecificRaffleFromBlockchain(raffleId) {
  try {
    logger.debug(`🔄 Syncing raffle ${raffleId} from blockchain...`);
    const contractResult = await raffleContractService.getRaffleInfo(raffleId);
    
    if (contractResult.raffle) {
      await upsertRaffleFromContract(contractResult.raffle);
      logger.debug(`✅ Synced raffle ${raffleId}`);
    }
  } catch (error) {
    logger.error(`❌ Failed to sync raffle ${raffleId} from blockchain:`, error);
  }
}

async function syncRaffleParticipantsFromBlockchain(raffleId) {
  try {
    logger.debug(`🔄 Syncing participants for raffle ${raffleId} from blockchain...`);
    const contractResult = await raffleContractService.getRaffleParticipants(raffleId);
    
    // Clear existing participants for this raffle
    await Participant.deleteMany({ raffleId: raffleId });
    
    // Get raffle info to calculate total paid per participant
    const raffleInfo = await Raffle.findOne({ raffleId: raffleId });
    const ticketPrice = raffleInfo ? raffleInfo.ticketPrice : 1;
    
    // Aggregate tickets by address since contract returns individual tickets as (address, 1) pairs
    const participantMap = new Map();
    
    // Process each ticket entry from the contract
    for (const [address, ticketCount] of contractResult.participants || []) {
      const addr = address.toString();
      if (participantMap.has(addr)) {
        participantMap.set(addr, participantMap.get(addr) + ticketCount);
      } else {
        participantMap.set(addr, ticketCount);
      }
    }
    
    logger.debug(`📊 Aggregated ${participantMap.size} unique participants from ${contractResult.participants?.length || 0} ticket entries`);
    
    // Insert aggregated participants into MongoDB
    for (const [address, totalTickets] of participantMap.entries()) {
      const participantData = {
        raffleId: raffleId,
        address: address,
        ticketCount: totalTickets,
        totalPaid: (totalTickets * ticketPrice).toString(), // Store as string as per schema
        paymentDenom: 'utestcore', // Default payment denomination
        firstPurchase: new Date(), // We don't have exact purchase time from contract
        lastPurchase: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await Participant.findOneAndUpdate(
        { raffleId: raffleId, address: address },
        { $set: participantData },
        { upsert: true, new: true }
      );
      
      logger.debug(`💾 Saved participant ${address}: ${totalTickets} tickets, ${participantData.totalPaid} total`);
    }
    
    logger.debug(`✅ Synced ${participantMap.size} participants for raffle ${raffleId}`);
  } catch (error) {
    logger.error(`❌ Failed to sync participants for raffle ${raffleId}:`, error);
  }
}

async function upsertRaffleFromContract(contractRaffle) {
  const raffleData = {
    raffleId: contractRaffle.id,
    creator: contractRaffle.creator,
    nftContract: contractRaffle.nft_contract,
    tokenId: contractRaffle.token_id,
    ticketPrice: parseInt(contractRaffle.price.amount) / 1_000_000, // Convert from ucore to CORE
    maxTickets: contractRaffle.max_tickets,
    totalSold: contractRaffle.total_sold,
    startTime: contractRaffle.start_time ? new Date(parseInt(contractRaffle.start_time) / 1_000_000) : null,
    endTime: new Date(parseInt(contractRaffle.end_time) / 1_000_000),
         status: contractRaffle.status, // Contract already returns 'active', 'completed', 'cancelled'
    winner: contractRaffle.winner,
    updatedAt: new Date()
  };

  // Only set createdAt on first insert
  const existingRaffle = await Raffle.findOne({ raffleId: contractRaffle.id });
  if (!existingRaffle) {
    raffleData.createdAt = new Date();
  }

  await Raffle.findOneAndUpdate(
    { raffleId: contractRaffle.id },
    { $set: raffleData },
    { upsert: true, new: true }
  );
  
  logger.debug(`✅ Upserted raffle ${contractRaffle.id}: ${contractRaffle.token_id}`);
}

module.exports = router;