const { CosmWasmClient } = require("@cosmjs/cosmwasm-stargate");
const logger = require('../config/logger');

class RaffleContractService {
  constructor() {
    this.client = null;
    this.rpcEndpoint = process.env.COREUM_RPC_URL || "https://full-node.testnet-1.coreum.dev:26657";
    this.contractAddress = process.env.RAFFLE_CONTRACT_ADDRESS || "testcore1lqaqslyw3kqj3tysa6cywh44e8mm2qyx0ps8qqt076kkna6zk8wsfl5p50";
  }

  async connect() {
    try {
      if (!this.contractAddress) {
        throw new Error('RAFFLE_CONTRACT_ADDRESS not configured');
      }
      
      logger.info(`Connecting to Coreum RPC: ${this.rpcEndpoint}`);
      this.client = await CosmWasmClient.connect(this.rpcEndpoint);
      logger.info(`✅ Connected to raffle contract: ${this.contractAddress}`);
      
      return true;
    } catch (error) {
      logger.error('❌ Failed to connect to raffle contract:', error);
      throw error;
    }
  }

  async getRaffleInfo(raffleId) {
    try {
      if (!this.client) {
        await this.connect();
      }

      const queryMsg = { raffle: { raffle_id: raffleId } };
      logger.debug(`🔍 Querying raffle ${raffleId}...`);
      
      const result = await this.client.queryContractSmart(this.contractAddress, queryMsg);
      logger.debug(`✅ Raffle ${raffleId} result:`, result);
      
      return result;
    } catch (error) {
      logger.error(`❌ Failed to fetch raffle ${raffleId}:`, error);
      throw error;
    }
  }

  async getAllRaffles(limit = 50) {
    try {
      if (!this.client) {
        await this.connect();
      }

      const queryMsg = { 
        raffles: { 
          start_after: null, 
          limit: limit 
        } 
      };
      
      logger.debug('🔍 Querying all raffles...');
      const result = await this.client.queryContractSmart(this.contractAddress, queryMsg);
      logger.debug(`✅ Found ${result.raffles?.length || 0} raffles`);
      
      return result;
    } catch (error) {
      logger.error('❌ Failed to fetch all raffles:', error);
      throw error;
    }
  }

  async getRaffleParticipants(raffleId, limit = 100) {
    try {
      if (!this.client) {
        await this.connect();
      }

      const queryMsg = { 
        participants: { 
          raffle_id: raffleId,
          start_after: null,
          limit: limit
        } 
      };
      
      logger.debug(`🔍 Querying participants for raffle ${raffleId}...`);
      const result = await this.client.queryContractSmart(this.contractAddress, queryMsg);
      logger.debug(`✅ Found ${result.participants?.length || 0} participants for raffle ${raffleId}`);
      
      return result;
    } catch (error) {
      logger.error(`❌ Failed to fetch participants for raffle ${raffleId}:`, error);
      throw error;
    }
  }

  async getParticipant(raffleId, address) {
    try {
      if (!this.client) {
        await this.connect();
      }

      const queryMsg = { 
        participant: { 
          raffle_id: raffleId,
          address: address
        } 
      };
      
      logger.debug(`🔍 Querying participant ${address} for raffle ${raffleId}...`);
      const result = await this.client.queryContractSmart(this.contractAddress, queryMsg);
      
      return result;
    } catch (error) {
      logger.error(`❌ Failed to fetch participant ${address} for raffle ${raffleId}:`, error);
      throw error;
    }
  }

  disconnect() {
    if (this.client) {
      this.client.disconnect();
      this.client = null;
      logger.info('Disconnected from raffle contract');
    }
  }
}

module.exports = new RaffleContractService();