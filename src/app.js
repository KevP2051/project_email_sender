
/**
 * Email Sender Service
 * Main application file - Initializes Kafka consumer and email service
 */

require('dotenv').config();
const express = require('express');
const KafkaConsumerService = require('./services/KafkaConsumerService');

const app = express();
const PORT = process.env.PORT || 3032;

// Middleware
app.use(express.json());

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
    console.log('========================================');
    console.log('Email Sender Service Starting...');
    console.log('========================================');

    // Initialize Kafka Consumer
    consumerService = new KafkaConsumerService();
    await consumerService.initialize();

    // Start consuming messages
    await consumerService.startConsuming();

    // Start Express server
    app.listen(PORT, () => {
      console.log('========================================');
      console.log(`Email Sender Service running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`Status: http://localhost:${PORT}/status`);
      console.log('========================================');
    });
  } catch (error) {
    console.error('Failed to start Email Sender Service:', error.message);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  console.log('\nShutting down Email Sender Service...');

  if (consumerService) {
    await consumerService.disconnect();
  }

  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start the service
startService();