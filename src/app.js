
/**
 * Email Sender Service
 * Main application file - Initializes Kafka consumer and email service
 */

require('dotenv').config();
const express = require('express');
const KafkaConsumerService = require('./services/KafkaConsumerService');
const correlationIdMiddleware = require('./middlewares/correlationId');
const logsController = require('./controllers/logsController');
const { logger, logError } = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3032;

// Middleware
app.use(express.json());
app.use(correlationIdMiddleware);

// Logs viewer interface
app.get('/logs', (req, res) => logsController.renderLogsViewer(req, res));

// Logs API routes
app.get('/api/logs/files', (req, res) => logsController.getLogFiles(req, res));
app.get('/api/logs/business', (req, res) => logsController.getBusinessLogs(req, res));
app.get('/api/logs/:filename', (req, res) => logsController.getLogs(req, res));
app.get('/api/logs/search/:correlationId', (req, res) => logsController.searchByCorrelationId(req, res));
app.get('/api/logs/errors/recent', (req, res) => logsController.getRecentErrors(req, res));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'email-sender-service',
    timestamp: new Date().toISOString(),
    kafka: {
      enabled: process.env.KAFKA_ENABLED === 'true',
      connected: consumerService?.isConsumerConnected() || false,
    },
  });
});

// Service status endpoint
app.get('/status', (req, res) => {
  res.json({
    service: 'Email Sender Service',
    version: '1.0.0',
    uptime: process.uptime(),
    kafka: {
      enabled: process.env.KAFKA_ENABLED === 'true',
      brokers: process.env.KAFKA_BROKERS,
      topic: process.env.KAFKA_TOPIC_EMAIL_NOTIFICATIONS,
      groupId: process.env.KAFKA_GROUP_ID,
      connected: consumerService?.isConsumerConnected() || false,
    },
    email: {
      service: 'gmail',
      user: process.env.EMAIL_USER,
    },
  });
});

// Initialize Kafka Consumer Service
let consumerService = null;

async function startService() {
  try {
    logger.info('========================================');
    logger.info('Email Sender Service Starting...');
    logger.info('========================================');

    // Initialize Kafka Consumer
    consumerService = new KafkaConsumerService();
    await consumerService.initialize();

    // Start consuming messages
    await consumerService.startConsuming();

    // Start Express server
    app.listen(PORT, () => {
      logger.info('========================================');
      logger.info(`Email Sender Service running on port ${PORT}`, {
        service: 'email-sender-service',
        port: PORT
      });
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`Status: http://localhost:${PORT}/status`);
      logger.info(`Logs API: http://localhost:${PORT}/api/logs/files`);
      logger.info('========================================');
    });
  } catch (error) {
    logError(error, {
      operation: 'startService',
      service: 'email-sender-service'
    });
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down Email Sender Service...', {
    service: 'email-sender-service'
  });

  if (consumerService) {
    await consumerService.disconnect();
  }

  logger.info('Email Sender Service stopped', {
    service: 'email-sender-service'
  });
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start the service
startService();