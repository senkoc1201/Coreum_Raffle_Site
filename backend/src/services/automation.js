const blockchainService = require('./blockchain');
const Raffle = require('../models/Raffle');
const logger = require('../config/logger');
const axios = require('axios');

class AutomationService {
  constructor() {
    this.isRunning = false;
    this.isProcessing = false; // Prevent concurrent execution
    this.intervalMs = parseInt(process.env.AUTOMATION_INTERVAL_MS) || 60000;
    this.enabled = process.env.AUTOMATION_ENABLED === 'true';
  }

  async start() {
    if (!this.enabled) {
      logger.info('Automation service is disabled');
      return;
    }

    if (this.isRunning) {
      logger.warn('Automation service is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting automation service...');
    
    // Ensure blockchain service is connected and signing client is initialized
    try {
      await blockchainService.connect();
      if (!blockchainService.isSigningClientReady()) {
        const initialized = await blockchainService.initializeSigningClient();
        if (!initialized) {
          throw new Error('Failed to initialize signing client');
        }
      }
      logger.info('✅ Blockchain service and signing client ready for automation');
    } catch (error) {
      logger.error('❌ Failed to initialize blockchain service for automation:', error);
      this.isRunning = false;
      return;
    }
    
    // Start the automation loop
    this.automationInterval = setInterval(async () => {
      try {
        await this.checkAndEndRaffles();
      } catch (error) {
        logger.error('Error in automation loop:', error);
      }
    }, this.intervalMs);

    logger.info(`Automation service started with ${this.intervalMs}ms interval`);
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.automationInterval) {
      clearInterval(this.automationInterval);
    }

    logger.info('Automation service stopped');
  }

  async checkAndEndRaffles() {
    // Prevent concurrent execution
    if (this.isProcessing) {
      logger.info('⏳ Automation check already in progress, skipping...');
      return;
    }
    
    this.isProcessing = true;
    
    try {
      // Find raffles that can be ended
      const eligibleRaffles = await this.findEligibleRaffles();
      
      if (eligibleRaffles.length === 0) {
        logger.debug('No raffles eligible for ending');
        return;
      }

      logger.info(`Found ${eligibleRaffles.length} raffles eligible for ending`);
      
      for (const raffle of eligibleRaffles) {
        try {
          await this.endRaffle(raffle);
        } catch (error) {
          logger.error(`Failed to end raffle ${raffle.raffleId}:`, error);
        }
      }
      
    } catch (error) {
      logger.error('Error checking for raffles to end:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  async findEligibleRaffles() {
    try {
      const now = new Date();
      // Add 30 second buffer to allow for drand timing
      const safeTime = new Date(now.getTime() - 30000);
      
      // Find raffles that are:
      // 1. Still active
      // 2. Have sold at least 1 ticket
      // 3. Either expired by time (with safety buffer) OR sold out
      const raffles = await Raffle.find({
        status: 'active',
        totalSold: { $gt: 0 },
        $or: [
          { endTime: { $lte: safeTime } }, // Time expired with buffer
          { $expr: { $gte: ['$totalSold', '$maxTickets'] } } // Sold out
        ]
      });
      
      logger.debug(`Found ${raffles.length} raffles eligible for ending`);
      
      return raffles;
    } catch (error) {
      logger.error('Error finding eligible raffles:', error);
      return [];
    }
  }

  async endRaffle(raffle) {
    try {
      logger.info(`🎯 Attempting to end raffle ${raffle.raffleId} (${raffle.tokenId})`);
      
      // Ensure signing client is available
      if (!blockchainService.isSigningClientReady()) {
        logger.error('❌ Signing client not initialized. Cannot execute transactions.');
        throw new Error('Signing client not initialized');
      }
      
      // Step 1: Get current contract state to ensure we use exact total_sold value
      logger.info('📊 Fetching current contract state...');
      const contractRaffle = await blockchainService.getRaffleInfo(parseInt(raffle.raffleId));
      if (!contractRaffle || !contractRaffle.raffle) {
        throw new Error(`Failed to get contract state for raffle ${raffle.raffleId}`);
      }
      
      const contractTotalSold = contractRaffle.raffle.total_sold;
      logger.info(`✅ Contract total_sold: ${contractTotalSold} (MongoDB totalSold: ${raffle.totalSold})`);
      
      // Verify alignment between contract and MongoDB
      if (contractTotalSold !== raffle.totalSold) {
        logger.warn(`⚠️ MISMATCH: Contract total_sold (${contractTotalSold}) != MongoDB totalSold (${raffle.totalSold})`);
        logger.warn(`Using contract value (${contractTotalSold}) for winner calculation to ensure accuracy`);
      } else {
        logger.info(`✅ Perfect alignment: Contract and MongoDB both show ${contractTotalSold} tickets sold`);
      }
      
      // Step 2: Get fresh drand randomness (exactly like Ubuntu command)
      logger.info('🎲 Fetching drand randomness...');
      const drandData = await this.getDrandRandomness();
      if (!drandData) {
        throw new Error('Failed to get drand randomness');
      }
      
      logger.info(`✅ Drand data: Round=${drandData.round}, Randomness=${drandData.randomness.substring(0, 20)}...`);
      
      // Step 3: Construct the end_raffle message (snake_case as expected by contract)
      const endRaffleMsg = {
        end_raffle: {
          raffle_id: parseInt(raffle.raffleId),
          drand_round: parseInt(drandData.round.toString()),
          randomness: drandData.randomness.toString(),
          signature: drandData.signature.toString()
        }
      };
      
      logger.info(`📝 End raffle message:`, JSON.stringify(endRaffleMsg, null, 2));
      
      // Step 4: Execute the contract call (same as cored tx wasm execute)
      logger.info('🚀 Sending end_raffle transaction to contract...');
      logger.info(`📝 Message details: raffle_id=${endRaffleMsg.end_raffle.raffle_id}, drand_round=${endRaffleMsg.end_raffle.drand_round}, randomness_length=${endRaffleMsg.end_raffle.randomness.length}, signature_length=${endRaffleMsg.end_raffle.signature.length}`);
      
            const result = await blockchainService.executeContract(
        blockchainService.automationAddress,
        endRaffleMsg
      );

      // Handle different result formats
      if (result && (result.code === 0 || result.transactionHash)) {
        logger.info(`✅ Successfully ended raffle ${raffle.raffleId}!`);
        logger.info(`📄 Transaction Hash: ${result.transactionHash}`);
        
        // Step 5: Look up the actual winner address from the contract
        logger.info(`🔍 Looking up winner address from contract...`);
        const updatedRaffleInfo = await blockchainService.getRaffleInfo(parseInt(raffle.raffleId));
        
        if (!updatedRaffleInfo.raffle) {
          throw new Error(`Failed to get updated raffle info for raffle ${raffle.raffleId}`);
        }
        
        const winnerAddress = updatedRaffleInfo.raffle.winner;
        if (!winnerAddress) {
          throw new Error(`No winner found in contract for raffle ${raffle.raffleId}`);
        }
        
        logger.info(`🏆 Winner address from contract: ${winnerAddress}`);
        
        // Step 6: Calculate winning ticket index using EXACT contract total_sold value
        const winningTicketIndex = this.calculateWinningTicketIndex(drandData.randomness, contractTotalSold);
        logger.info(`🎲 Calculated winning ticket index: ${winningTicketIndex} (ticket #${winningTicketIndex + 1}) using contract total_sold: ${contractTotalSold}`);
        
        // Step 7: Update MongoDB with results including winner address
        await this.updateRaffleAfterEnding(raffle.raffleId, {
          status: 'completed', // Ensure status is updated
          endTxHash: result.transactionHash,
          drandRound: drandData.round,
          winnerTicketIndex: winningTicketIndex,
          winner: winnerAddress,
          endReason: contractTotalSold >= raffle.maxTickets ? 'soldout' : 'time'
        });
        
        logger.info(`🏆 Raffle ${raffle.raffleId} completed successfully! Winner: ${winnerAddress}`);
        
      } else {
        throw new Error(`Transaction failed with code ${result.code}: ${result.rawLog}`);
      }
      
    } catch (error) {
      // Handle specific error types gracefully
      if (error.message && error.message.includes('tx already exists in cache')) {
        logger.warn(`⚠️ Transaction already in progress for raffle ${raffle.raffleId}, skipping...`);
        return; // Don't throw, just skip
      } else if (error.message && error.message.includes('raffle not active')) {
        logger.warn(`⚠️ Raffle ${raffle.raffleId} is no longer active, updating database...`);
        // Update MongoDB to match contract state
        await this.syncRaffleStatus(raffle.raffleId);
        return; // Don't throw, just skip
      } else if (error.message && error.message.includes('raffle not ready to end')) {
        logger.warn(`⚠️ Raffle ${raffle.raffleId} is not ready to end yet, skipping...`);
        return; // Don't throw, just skip
      } else {
        logger.error(`❌ Failed to end raffle ${raffle.raffleId}:`, error);
        throw error;
      }
    }
  }

  // Sync raffle status with contract (when database is out of sync)
  async syncRaffleStatus(raffleId) {
    try {
      const contractRaffle = await blockchainService.getRaffleInfo(parseInt(raffleId));
      if (contractRaffle && contractRaffle.raffle) {
        await Raffle.findOneAndUpdate(
          { raffleId: raffleId },
          { 
            status: contractRaffle.raffle.status,
            winner: contractRaffle.raffle.winner,
            totalSold: contractRaffle.raffle.total_sold
          }
        );
        logger.info(`✅ Synced raffle ${raffleId} status: ${contractRaffle.raffle.status}`);
      }
    } catch (error) {
      logger.error(`Failed to sync raffle ${raffleId} status:`, error.message);
    }
  }

  // Calculate winning ticket index using the same logic as the smart contract
  calculateWinningTicketIndex(randomness, totalSold) {
    try {
      // Convert hex randomness to bytes (same as contract)
      const rndBytes = Buffer.from(randomness, 'hex');
      if (rndBytes.length === 0) {
        throw new Error('Empty randomness');
      }
      
      // Use first 8 bytes (same as contract)
      const slice = rndBytes.length >= 8 ? rndBytes.slice(0, 8) : rndBytes;
      const u64buf = Buffer.alloc(8);
      slice.copy(u64buf, 0);
      
      // Convert to u64 big endian (same as contract)
      const seed = u64buf.readBigUInt64BE(0);
      
      // Calculate winner index: seed % total_sold (same as contract)
      const winnerIndex = Number(seed % BigInt(totalSold));
      
      logger.debug(`Randomness: ${randomness.substring(0, 16)}..., Seed: ${seed}, Total: ${totalSold}, Winner: ${winnerIndex}`);
      
      return winnerIndex;
    } catch (error) {
      logger.error('Error calculating winning ticket index:', error);
      throw error;
    }
  }

  // Update raffle in MongoDB after successful ending
  async updateRaffleAfterEnding(raffleId, updateData) {
    try {
      const updated = await Raffle.findOneAndUpdate(
        { raffleId: raffleId },
        { 
          $set: {
            ...updateData,
            updatedAt: new Date()
          }
        },
        { new: true }
      );
      
      if (updated) {
        logger.info(`Updated raffle ${raffleId} in MongoDB:`, {
          endTxHash: updateData.endTxHash,
          drandRound: updateData.drandRound,
          winnerTicketIndex: updateData.winnerTicketIndex,
          winner: updateData.winner,
          endReason: updateData.endReason
        });
      } else {
        logger.warn(`Failed to find raffle ${raffleId} in MongoDB for update`);
      }
      
      return updated;
    } catch (error) {
      logger.error(`Error updating raffle ${raffleId} in MongoDB:`, error);
      throw error;
    }
  }

  async getDrandRandomness() {
    try {
      // Get the latest drand beacon
      // Using the League of Entropy mainnet
      const response = await axios.get('https://api.drand.sh/public/latest', {
        timeout: 10000
      });
      
      if (response.data && response.data.round && response.data.randomness && response.data.signature) {
        return {
          round: response.data.round,
          randomness: response.data.randomness,
          signature: response.data.signature
        };
      } else {
        throw new Error('Invalid drand response format');
      }
    } catch (error) {
      logger.error('Failed to get drand randomness:', error);
      return null;
    }
  }

  async getDrandInfo() {
    try {
      // Get drand chain info
      const response = await axios.get('https://api.drand.sh/info', {
        timeout: 10000
      });
      
      return response.data;
    } catch (error) {
      logger.error('Failed to get drand info:', error);
      return null;
    }
  }

  // Get stats about automation activity
  async getStats() {
    try {
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const stats = {
        enabled: this.enabled,
        running: this.isRunning,
        intervalMs: this.intervalMs,
        eligibleRaffles: await Raffle.countDocuments({
          status: 'active',
          totalSold: { $gt: 0 },
          $or: [
            { endTime: { $lte: now } },
            { $expr: { $gte: ['$totalSold', '$maxTickets'] } }
          ]
        }),
                 endedLast24h: await Raffle.countDocuments({
           status: 'completed',
           updatedAt: { $gte: last24h }
         }),
        totalActiveRaffles: await Raffle.countDocuments({
          status: 'active'
        })
      };
      
      return stats;
    } catch (error) {
      logger.error('Error getting automation stats:', error);
      return null;
    }
  }
}

module.exports = new AutomationService();
