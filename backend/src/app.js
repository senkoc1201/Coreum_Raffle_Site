const express = require('express');
const cors = require('cors');
const logger = require('./config/logger');

// Import routes
const raffleRoutes = require('./routes/raffles');
const systemRoutes = require('./routes/system');

class App {
  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    // CORS configuration
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true
    }));

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging middleware
    this.app.use((req, res, next) => {
      logger.http(`${req.method} ${req.path} - ${req.ip}`);
      next();
    });

    // Request timeout middleware
    this.app.use((req, res, next) => {
      res.setTimeout(30000, () => {
        res.status(408).json({ error: 'Request timeout' });
      });
      next();
    });
  }

  setupRoutes() {
    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        name: 'Coreum Raffle Indexer API',
        version: '1.0.0',
        status: 'online',
        endpoints: {
          raffles: '/api/raffles',
          system: '/api/system'
        }
      });
    });

    // API routes
    this.app.use('/api/raffles', raffleRoutes);
    this.app.use('/api/system', systemRoutes);

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method
      });
    });
  }

  setupErrorHandling() {
    // Global error handler
    this.app.use((err, req, res, next) => {
      logger.error('Unhandled error:', err);

      // Don't expose error details in production
      const isDev = process.env.NODE_ENV === 'development';
      
      res.status(err.status || 500).json({
        error: isDev ? err.message : 'Internal server error',
        ...(isDev && { stack: err.stack })
      });
    });

    // Graceful shutdown handling
    process.on('uncaughtException', (err) => {
      logger.error('Uncaught Exception:', err);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
  }

  getExpressApp() {
    return this.app;
  }
}

module.exports = new App();
