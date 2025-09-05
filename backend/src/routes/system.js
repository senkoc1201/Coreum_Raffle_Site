const express = require('express');
const router = express.Router();
const database = require('../config/database');
const blockchainService = require('../services/blockchain');
const indexerService = require('../services/indexer');
const automationService = require('../services/automation');
const logger = require('../config/logger');

// GET /api/system/health - Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: database.isConnected(),
        blockchain: !!blockchainService.client,
        indexer: indexerService.isRunning,
        automation: automationService.isRunning
      }
    };
    
    // Overall status
    const allHealthy = Object.values(health.services).every(status => status === true);
    health.status = allHealthy ? 'ok' : 'degraded';
    
    const statusCode = allHealthy ? 200 : 503;
    res.status(statusCode).json(health);
    
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// GET /api/system/status - Detailed system status
router.get('/status', async (req, res) => {
  try {
    const currentHeight = await blockchainService.getCurrentHeight();
    const lastProcessed = blockchainService.getLastProcessedHeight();
    const automationStats = await automationService.getStats();
    
    const status = {
      blockchain: {
        connected: !!blockchainService.client,
        chainId: blockchainService.chainId,
        currentHeight,
        lastProcessedHeight: lastProcessed,
        blocksBehind: currentHeight - lastProcessed,
        contractAddress: blockchainService.contractAddress
      },
      indexer: {
        running: indexerService.isRunning,
        intervalMs: indexerService.intervalMs,
        batchSize: indexerService.batchSize
      },
      automation: automationStats,
      database: {
        connected: database.isConnected(),
        connectionState: database.connection?.connection?.readyState
      }
    };
    
    res.json(status);
    
  } catch (error) {
    logger.error('Status check error:', error);
    res.status(500).json({ error: 'Status check failed' });
  }
});

// POST /api/system/indexer/start - Start the indexer manually
router.post('/indexer/start', async (req, res) => {
  try {
    if (indexerService.isRunning) {
      return res.json({ message: 'Indexer is already running' });
    }
    
    await indexerService.start();
    res.json({ message: 'Indexer started successfully' });
    
  } catch (error) {
    logger.error('Failed to start indexer:', error);
    res.status(500).json({ error: 'Failed to start indexer' });
  }
});

// POST /api/system/indexer/stop - Stop the indexer manually
router.post('/indexer/stop', async (req, res) => {
  try {
    await indexerService.stop();
    res.json({ message: 'Indexer stopped successfully' });
    
  } catch (error) {
    logger.error('Failed to stop indexer:', error);
    res.status(500).json({ error: 'Failed to stop indexer' });
  }
});

// POST /api/system/automation/start - Start automation manually
router.post('/automation/start', async (req, res) => {
  try {
    if (automationService.isRunning) {
      return res.json({ message: 'Automation is already running' });
    }
    
    await automationService.start();
    res.json({ message: 'Automation started successfully' });
    
  } catch (error) {
    logger.error('Failed to start automation:', error);
    res.status(500).json({ error: 'Failed to start automation' });
  }
});

// POST /api/system/automation/stop - Stop automation manually
router.post('/automation/stop', async (req, res) => {
  try {
    await automationService.stop();
    res.json({ message: 'Automation stopped successfully' });
    
  } catch (error) {
    logger.error('Failed to stop automation:', error);
    res.status(500).json({ error: 'Failed to stop automation' });
  }
});

// POST /api/system/indexer/process - Process blocks manually
router.post('/indexer/process', async (req, res) => {
  try {
    const { fromHeight, toHeight } = req.body;
    
    if (!fromHeight || !toHeight) {
      return res.status(400).json({ error: 'fromHeight and toHeight are required' });
    }
    
    if (fromHeight > toHeight) {
      return res.status(400).json({ error: 'fromHeight must be less than or equal to toHeight' });
    }
    
    const events = await blockchainService.getContractEvents(fromHeight, toHeight);
    
    // Process events
    for (const event of events) {
      await indexerService.processEvent(event);
    }
    
    res.json({
      message: `Processed blocks ${fromHeight} to ${toHeight}`,
      eventsProcessed: events.length
    });
    
  } catch (error) {
    logger.error('Manual processing error:', error);
    res.status(500).json({ error: 'Manual processing failed' });
  }
});

// GET /api/system/logs - Get recent logs (last 100 entries)
router.get('/logs', async (req, res) => {
  try {
    const { level = 'info', limit = 100 } = req.query;
    
    // This is a simplified implementation
    // In production, you might want to use a proper log aggregation service
    res.json({
      message: 'Log endpoint not fully implemented',
      note: 'Check log files or implement log aggregation service'
    });
    
  } catch (error) {
    logger.error('Log retrieval error:', error);
    res.status(500).json({ error: 'Log retrieval failed' });
  }
});

module.exports = router;
