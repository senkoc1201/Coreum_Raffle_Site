const { StargateClient, SigningStargateClient } = require('@cosmjs/stargate');
const { CosmWasmClient, SigningCosmWasmClient } = require('@cosmjs/cosmwasm-stargate');
const { DirectSecp256k1HdWallet } = require('@cosmjs/proto-signing');
const { TendermintRpcClient } = require('@cosmjs/tendermint-rpc');
const { StdFee } = require('@cosmjs/stargate');
const logger = require('../config/logger');

class BlockchainService {
  constructor() {
    this.client = null;
    this.signingClient = null;
    this.rpcClient = null;
    this.contractAddress = process.env.RAFFLE_CONTRACT_ADDRESS;
    this.chainId = process.env.COREUM_CHAIN_ID || 'coreum-testnet-1';
    // Provide a safe default RPC URL if not configured
    this.rpcUrl = process.env.COREUM_RPC_URL || 'https://full-node.testnet-1.coreum.dev:26657';
    this.lastProcessedHeight = parseInt(process.env.INDEXING_START_HEIGHT) || 1;
  }

  async connect() {
    try {
      // Validate RPC URL
      if (!this.rpcUrl || typeof this.rpcUrl !== 'string') {
        throw new Error('COREUM_RPC_URL is not set or invalid');
      }
      
      logger.info(`Attempting to connect to RPC: ${this.rpcUrl}`);
      
      // Connect to Coreum RPC with timeout
      this.client = await StargateClient.connect(this.rpcUrl);
      logger.info('StargateClient connected successfully');
      
      // TendermintRpcClient is optional for basic operations
      try {
        this.rpcClient = await TendermintRpcClient.connect(this.rpcUrl);
        logger.info('TendermintRpcClient connected successfully');
      } catch (rpcError) {
        logger.warn('TendermintRpcClient connection failed, but StargateClient is working:', rpcError.message);
        this.rpcClient = null;
      }
      
      logger.info(`Connected to Coreum blockchain: ${this.rpcUrl}`);
      logger.info(`Chain ID: ${this.chainId}`);
      if (this.contractAddress) {
        logger.info(`Contract Address: ${this.contractAddress}`);
      } else {
        logger.warn('RAFFLE_CONTRACT_ADDRESS is not set. Indexer will connect but cannot filter contract events until set.');
      }
      
      // Initialize signing client for automation if mnemonic is provided
      if (process.env.AUTOMATION_MNEMONIC) {
        await this.initializeSigningClient();
      }
      
      return true;
    } catch (error) {
      logger.error('Failed to connect to blockchain:', error);
      throw error;
    }
  }

  async initializeSigningClient() {
    try {
      const mnemonic = process.env.AUTOMATION_MNEMONIC;
      if (!mnemonic) {
        logger.info('AUTOMATION_MNEMONIC not set, skipping signing client initialization');
        return false;
      }
      
      // Create wallet from mnemonic
      const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
        prefix: 'testcore'
      });
      
      this.signingClient = await SigningCosmWasmClient.connectWithSigner(
        this.rpcUrl,
        wallet
      );
      
      const accounts = await wallet.getAccounts();
      this.automationAddress = accounts[0].address;
      
      logger.info(`Automation signing client initialized: ${this.automationAddress}`);
      return true;
    } catch (error) {
      logger.error('Failed to initialize signing client:', error);
      return false;
    }
  }

  // Check if signing client is ready
  isSigningClientReady() {
    return this.signingClient !== null && this.automationAddress !== null;
  }

  async getCurrentHeight() {
    try {
      const height = await this.client.getHeight();
      return height;
    } catch (error) {
      logger.error('Failed to get current height:', error);
      throw error;
    }
  }

  async getBlockWithTxs(height) {
    try {
      const block = await this.client.getBlock(height);
      return block;
    } catch (error) {
      logger.error(`Failed to get block at height ${height}:`, error);
      throw error;
    }
  }

  async searchTx(query) {
    try {
      const txs = await this.client.searchTx(query);
      return txs;
    } catch (error) {
      logger.error('Failed to search transactions:', error);
      throw error;
    }
  }

  // Get contract events from a specific height range
  async getContractEvents(fromHeight, toHeight) {
    try {
      const events = [];
      
      for (let height = fromHeight; height <= toHeight; height++) {
        // Search for wasm events at this height
        const query = `wasm._contract_address='${this.contractAddress}' AND tx.height=${height}`;
        const txs = await this.searchTx(query);
        
        for (const tx of txs) {
          if (tx.code === 0) { // Only successful transactions
            const contractEvents = this.extractContractEvents(tx, height);
            events.push(...contractEvents);
          }
        }
      }
      
      return events;
    } catch (error) {
      logger.error(`Failed to get contract events from height ${fromHeight} to ${toHeight}:`, error);
      throw error;
    }
  }

  // Extract and parse contract events from transaction
  extractContractEvents(tx, height) {
    const events = [];
    
    try {
      for (const log of tx.events) {
        if (log.type === 'wasm') {
          const eventData = this.parseWasmEvent(log);
          if (eventData) {
            events.push({
              ...eventData,
              height,
              txHash: tx.hash,
              timestamp: tx.timestamp || new Date()
            });
          }
        }
      }
    } catch (error) {
      logger.error('Failed to extract contract events:', error);
    }
    
    return events;
  }

  // Parse wasm event attributes into structured data
  parseWasmEvent(wasmLog) {
    try {
      const attributes = {};
      
      for (const attr of wasmLog.attributes) {
        attributes[attr.key] = attr.value;
      }
      
      // Check if this is a raffle contract event
      if (attributes._contract_address !== this.contractAddress) {
        return null;
      }
      
      // Determine event type and return structured data
      if (attributes.action) {
        return {
          type: attributes.action,
          contractAddress: attributes._contract_address,
          attributes
        };
      }
      
      return null;
    } catch (error) {
      logger.error('Failed to parse wasm event:', error);
      return null;
    }
  }

  // Execute contract message (for automation)
  async executeContract(senderAddress, msg, funds = []) {
    try {
      if (!this.signingClient) {
        throw new Error('Signing client not initialized');
      }
      
      const fee = {
        amount: [{ denom: 'utestcore', amount: '200000' }], // Increased fees for higher gas limit
        gas: '1000000' // Much higher gas limit for BLS signature verification
      };
      
      const result = await this.signingClient.execute(
        senderAddress,
        this.contractAddress,
        msg,
        fee,
        'Automated raffle ending',
        funds
      );
      
      return result;
    } catch (error) {
      logger.error('Failed to execute contract:', error);
      throw error;
    }
  }

  // Query contract for raffle info (for automation to get exact total_sold)
  async getRaffleInfo(raffleId) {
    try {
      if (!this.contractAddress) {
        throw new Error('Contract address not set');
      }
      
      // Create CosmWasmClient for contract queries (StargateClient doesn't have queryContractSmart)
      const cosmWasmClient = await CosmWasmClient.connect(this.rpcUrl);
      
      // Query the contract for raffle info
      const queryMsg = {
        raffle: {
          raffle_id: raffleId
        }
      };
      
      const result = await cosmWasmClient.queryContractSmart(
        this.contractAddress,
        queryMsg
      );
      
      // Disconnect the temporary client
      cosmWasmClient.disconnect();
      
      return result;
    } catch (error) {
      logger.error(`Failed to query raffle info for raffle ${raffleId}:`, error);
      throw error;
    }
  }

  // Get last processed height
  getLastProcessedHeight() {
    return this.lastProcessedHeight;
  }

  // Update last processed height
  setLastProcessedHeight(height) {
    this.lastProcessedHeight = height;
  }

  async disconnect() {
    if (this.client) {
      this.client.disconnect();
    }
    if (this.rpcClient) {
      this.rpcClient.disconnect();
    }
    logger.info('Disconnected from blockchain');
  }
}

module.exports = new BlockchainService();
