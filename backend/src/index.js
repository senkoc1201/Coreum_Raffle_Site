require('dotenv').config();

// Set default environment variables for Coreum testnet if not provided
if (!process.env.COREUM_CHAIN_ID) process.env.COREUM_CHAIN_ID = 'coreum-testnet-1';
if (!process.env.COREUM_RPC_URL) process.env.COREUM_RPC_URL = 'https://full-node.testnet-1.coreum.dev:26657';
if (!process.env.MONGODB_URI) process.env.MONGODB_URI = 'mongodb://localhost:27017/degen-raffle';
if (!process.env.RAFFLE_CONTRACT_ADDRESS) process.env.RAFFLE_CONTRACT_ADDRESS = 'testcore1lqaqslyw3kqj3tysa6cywh44e8mm2qyx0ps8qqt076kkna6zk8wsfl5p50';
if (!process.env.PORT) process.env.PORT = '3000';
if (!process.env.LOG_LEVEL) process.env.LOG_LEVEL = 'info';

const app = require('./app');
const database = require('./config/database');
const blockchainService = require('./services/blockchain');
const indexerService = require('./services/indexer');
const automationService = require('./services/automation');
const logger = require('./config/logger');

class CoreumRaffleIndexer {
  constructor() {
    this.server = null;
    this.port = process.env.PORT || 3000;
  }

  async start() {
    try {
      logger.info('Starting Coreum Raffle Indexer...');

      // 1. Connect to MongoDB
      logger.info('Connecting to MongoDB...');
      await database.connect();

      // 2. Connect to Coreum blockchain
      logger.info('Connecting to Coreum blockchain...');
      await blockchainService.connect();

      // 3. Start HTTP server
      logger.info('Starting HTTP server...');
      this.server = app.getExpressApp().listen(this.port, () => {
        logger.info(`HTTP server running on port ${this.port}`);
      });

      // 4. Start indexer service
      logger.info('Starting indexer service...');
      await indexerService.start();

      // 5. Start automation service
      logger.info('Starting automation service...');
      await automationService.start();

      logger.info('Coreum Raffle Indexer started successfully!');
      logger.info(`API available at: http://localhost:${this.port}`);
      logger.info(`Health check: http://localhost:${this.port}/api/system/health`);

      // Setup graceful shutdown
      this.setupGracefulShutdown();

    } catch (error) {
      logger.error('Failed to start Coreum Raffle Indexer:', error);
      process.exit(1);
    }
  }

  async stop() {
    logger.info('Shutting down Coreum Raffle Indexer...');

    try {
      // Stop services in reverse order
      await automationService.stop();
      await indexerService.stop();
      await blockchainService.disconnect();
      await database.disconnect();

      if (this.server) {
        this.server.close(() => {
          logger.info('HTTP server closed');
        });
      }

      logger.info('Coreum Raffle Indexer stopped successfully');
    } catch (error) {
      logger.error('Error during shutdown:', error);
    }
  }

  setupGracefulShutdown() {
    // Handle termination signals
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
    
    signals.forEach(signal => {
      process.on(signal, async () => {
        logger.info(`Received ${signal}, initiating graceful shutdown...`);
        await this.stop();
        process.exit(0);
      });
    });

    // Handle process errors
    process.on('uncaughtException', async (err) => {
      logger.error('Uncaught Exception:', err);
      await this.stop();
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason, promise) => {
      logger.error('Unhandled Rejection:', reason);
      await this.stop();
      process.exit(1);
    });
  }
}

// Start the application
if (require.main === module) {
  const indexer = new CoreumRaffleIndexer();
  indexer.start().catch(err => {
    logger.error('Application startup failed:', err);
    process.exit(1);
  });
}

module.exports = CoreumRaffleIndexer;