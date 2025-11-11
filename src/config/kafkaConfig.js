/**
 * Kafka Configuration
 * Configuration for Kafka Consumer client in Email Sender Service
 * All values are configurable via environment variables
 */

/**
 * Helper function to parse integer from environment variable
 * @param {string} key - Environment variable key
 * @param {number} defaultValue - Default value if not set
 * @returns {number} Parsed integer value
 */
const getEnvInt = (key, defaultValue) => {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
};

/**
 * Helper function to parse float from environment variable
 * @param {string} key - Environment variable key
 * @param {number} defaultValue - Default value if not set
 * @returns {number} Parsed float value
 */
const getEnvFloat = (key, defaultValue) => {
  const value = process.env[key];
  return value ? parseFloat(value) : defaultValue;
};

/**
 * Helper function to parse boolean from environment variable
 * @param {string} key - Environment variable key
 * @param {boolean} defaultValue - Default value if not set
 * @returns {boolean} Parsed boolean value
 */
const getEnvBool = (key, defaultValue) => {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value === 'true' || value === '1';
};

module.exports = {
  // Kafka Broker Connection Settings
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),

  // Client ID for identification
  clientId: process.env.KAFKA_CLIENT_ID || 'email-sender-service',

  // Connection settings
  connectionTimeout: getEnvInt('KAFKA_CONNECTION_TIMEOUT', 10000),
  requestTimeout: getEnvInt('KAFKA_REQUEST_TIMEOUT', 30000),

  // Consumer Settings
  consumer: {
    allowAutoTopicCreation: getEnvBool('KAFKA_ALLOW_AUTO_TOPIC_CREATION', false),
    groupId: process.env.KAFKA_GROUP_ID || 'email-sender-service-group',
    sessionTimeout: getEnvInt('KAFKA_SESSION_TIMEOUT', 30000),
    rebalanceTimeout: getEnvInt('KAFKA_REBALANCE_TIMEOUT', 60000),
    heartbeatInterval: getEnvInt('KAFKA_HEARTBEAT_INTERVAL', 3000),
  },

  // Topic Definitions
  topics: {
    emailNotifications: process.env.KAFKA_TOPIC_EMAIL_NOTIFICATIONS || 'email-notifications',
    emailDLQ: process.env.KAFKA_TOPIC_EMAIL_DLQ || 'email-dlq', // Dead Letter Queue for failed emails
  },

  // Retry Policy
  retries: {
    maxAttempts: getEnvInt('KAFKA_MAX_RETRIES', 3),
    initialRetryTime: getEnvInt('KAFKA_INITIAL_RETRY_TIME', 100),
    maxRetryTime: getEnvInt('KAFKA_MAX_RETRY_TIME', 30000),
    multiplier: getEnvFloat('KAFKA_RETRY_MULTIPLIER', 2),
  },

  // Enable/Disable Kafka
  enabled: getEnvBool('KAFKA_ENABLED', false),
};
