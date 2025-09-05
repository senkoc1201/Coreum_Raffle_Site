const blockchainService = require('./blockchain');
const automationService = require('./automation');
const Raffle = require('../models/Raffle');
const Participant = require('../models/Participant');
const logger = require('../config/logger');

class IndexerService {
  constructor() {
    this.isRunning = false;
    this.batchSize = parseInt(process.env.INDEXING_BATCH_SIZE) || 100;
    this.intervalMs = parseInt(process.env.INDEXING_INTERVAL_MS) || 5000;
  }

  async start() {
    if (this.isRunning) {
      logger.warn('Indexer is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting blockchain indexer...');
    
    // Start the indexing loop
    this.indexingInterval = setInterval(async () => {
      try {
        await this.processNewBlocks();
      } catch (error) {
        logger.error('Error in indexing loop:', error);
      }
    }, this.intervalMs);

    // Start the time-based raffle ending check (every 2 minutes)
    this.timeCheckInterval = setInterval(async () => {
      try {
        await this.checkAllRafflesForTimeBasedEnding();
      } catch (error) {
        logger.error('Error in time-based ending check:', error);
      }
    }, 120000); // 2 minutes

    logger.info(`Indexer started with ${this.intervalMs}ms interval`);
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.indexingInterval) {
      clearInterval(this.indexingInterval);
    }

    if (this.timeCheckInterval) {
      clearInterval(this.timeCheckInterval);
    }

    logger.info('Indexer stopped');
  }

  async processNewBlocks() {
    try {
      const currentHeight = await blockchainService.getCurrentHeight();
      const lastProcessed = blockchainService.getLastProcessedHeight();
      
      if (currentHeight <= lastProcessed) {
        return; // No new blocks
      }

      const fromHeight = lastProcessed + 1;
      const toHeight = Math.min(fromHeight + this.batchSize - 1, currentHeight);
      
      logger.debug(`Processing blocks ${fromHeight} to ${toHeight}`);
      
      // Get contract events from the height range
      const events = await blockchainService.getContractEvents(fromHeight, toHeight);
      
      if (events.length > 0) {
        logger.info(`Found ${events.length} contract events in blocks ${fromHeight}-${toHeight}`);
        
        // Process each event
        for (const event of events) {
          await this.processEvent(event);
        }
      }
      
      // Update last processed height
      blockchainService.setLastProcessedHeight(toHeight);
      
    } catch (error) {
      logger.error('Error processing new blocks:', error);
    }
  }

  async processEvent(event) {
    try {
      const { type, attributes, height, txHash, timestamp } = event;
      
      switch (type) {
        case 'raffle_created':
          await this.handleRaffleCreated(attributes, height, txHash, timestamp);
          break;
          
        case 'raffle_ended':
          await this.handleRaffleEnded(attributes, height, txHash, timestamp);
          break;
          
        case 'winner_selected':
          await this.handleWinnerSelected(attributes, height, txHash, timestamp);
          break;
          
        case 'raffle_cancelled':
          await this.handleRaffleCancelled(attributes, height, txHash, timestamp);
          break;
          
        default:
          logger.warn(`Unknown event type: ${type}`);
      }
    } catch (error) {
      logger.error('Error processing event:', error);
    }
  }

  async handleRaffleCreated(attrs, height, txHash, timestamp) {
    try {
      const raffle = new Raffle({
        raffleId: attrs.raffle_id,
        creator: attrs.creator,
        cw721Address: attrs.cw721_addr,
        tokenId: attrs.token_id,
        ticketPrice: attrs.ticket_price,
        maxTickets: parseInt(attrs.max_tickets),
        startTime: new Date(parseInt(attrs.start_time) * 1000),
        endTime: new Date(parseInt(attrs.end_time) * 1000),
        paymentType: attrs.payment_cw20 ? 'cw20' : 'native',
        paymentDenom: attrs.payment_denom,
        paymentCw20: attrs.payment_cw20,
        revenueAddress: attrs.revenue_addr,
        status: 'active',
        createdAtHeight: height,
        createTxHash: txHash
      });
      
      await raffle.save();
      logger.info(`Created raffle ${attrs.raffle_id} by ${attrs.creator}`);
      
    } catch (error) {
      if (error.code === 11000) {
        logger.warn(`Raffle ${attrs.raffle_id} already exists`);
      } else {
        throw error;
      }
    }
  }

  async handleRaffleEnded(attrs, height, txHash, timestamp) {
    try {
      await Raffle.updateOne(
        { raffleId: attrs.raffle_id },
        {
          status: 'completed',
          endReason: attrs.end_reason,
          drandRound: attrs.drand_round,
          endedAtHeight: height,
          endTxHash: txHash
        }
      );
      
      logger.info(`Raffle ${attrs.raffle_id} ended: ${attrs.end_reason}`);
      
    } catch (error) {
      logger.error('Error handling raffle ended:', error);
    }
  }

  async handleWinnerSelected(attrs, height, txHash, timestamp) {
    try {
      await Raffle.updateOne(
        { raffleId: attrs.raffle_id },
        {
          winner: attrs.winner,
          winnerTicketIndex: parseInt(attrs.ticket_index)
        }
      );
      
      logger.info(`Winner selected for raffle ${attrs.raffle_id}: ${attrs.winner} (ticket ${attrs.ticket_index})`);
      
    } catch (error) {
      logger.error('Error handling winner selected:', error);
    }
  }

  async handleRaffleCancelled(attrs, height, txHash, timestamp) {
    try {
      await Raffle.updateOne(
        { raffleId: attrs.raffle_id },
        {
          status: 'cancelled',
          endedAtHeight: height,
          endTxHash: txHash
        }
      );
      
      logger.info(`Raffle ${attrs.raffle_id} cancelled by ${attrs.creator}`);
      
    } catch (error) {
      logger.error('Error handling raffle cancelled:', error);
    }
  }

  // Check if raffle meets ending conditions and trigger automation
  async checkAndTriggerRaffleEnding(raffleId) {
    try {
      // Get updated raffle data from database
      const raffle = await Raffle.findOne({ raffleId }).lean();
      if (!raffle) {
        logger.warn(`Raffle ${raffleId} not found for ending check`);
        return;
      }

      // Skip if raffle is not active
      if (raffle.status !== 'active') {
        logger.debug(`Raffle ${raffleId} is not active (${raffle.status}), skipping ending check`);
        return;
      }

      // Skip if no tickets sold
      if (raffle.totalSold === 0) {
        logger.debug(`Raffle ${raffleId} has no tickets sold, skipping ending check`);
        return;
      }

      const now = new Date();
      const timeExpired = now >= raffle.endTime;
      const soldOut = raffle.totalSold >= raffle.maxTickets;

      // Check if raffle meets ending conditions
      if (timeExpired || soldOut) {
        const reason = soldOut ? 'sold out' : 'time expired';
        logger.info(`🎯 Raffle ${raffleId} is eligible for ending (${reason}). Triggering automation...`);

        // Trigger automation to end the raffle
        try {
          await automationService.endRaffle(raffle);
          logger.info(`✅ Successfully triggered automation for raffle ${raffleId}`);
        } catch (error) {
          logger.error(`❌ Failed to trigger automation for raffle ${raffleId}:`, error);
          // Don't throw - we want indexing to continue even if automation fails
        }
      } else {
        logger.debug(`Raffle ${raffleId} not ready for ending. Tickets: ${raffle.totalSold}/${raffle.maxTickets}, End: ${raffle.endTime}`);
      }

    } catch (error) {
      logger.error(`Error checking raffle ${raffleId} for ending:`, error);
      // Don't throw - we want indexing to continue
    }
  }

  // Check all active raffles for time-based endings (called periodically)
  async checkAllRafflesForTimeBasedEnding() {
    try {
      const now = new Date();
      
      // Find active raffles that have expired by time and have tickets sold
      const expiredRaffles = await Raffle.find({
        status: 'active',
        totalSold: { $gt: 0 },
        endTime: { $lte: now }
      }).lean();

      if (expiredRaffles.length > 0) {
        logger.info(`🕐 Found ${expiredRaffles.length} time-expired raffles to process`);
        
        for (const raffle of expiredRaffles) {
          logger.info(`🎯 Processing time-expired raffle ${raffle.raffleId}`);
          try {
            await automationService.endRaffle(raffle);
            logger.info(`✅ Successfully ended time-expired raffle ${raffle.raffleId}`);
          } catch (error) {
            logger.error(`❌ Failed to end time-expired raffle ${raffle.raffleId}:`, error);
            // Continue with next raffle
          }
        }
      }

    } catch (error) {
      logger.error('Error checking raffles for time-based ending:', error);
    }
  }
}

module.exports = new IndexerService();