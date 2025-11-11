/**
 * Kafka Consumer Service
 * Consumes email notification events from Kafka and processes them
 */

const { Kafka } = require('kafkajs');
const kafkaConfig = require('../config/kafkaConfig');
const EmailService = require('./EmailService');
const EmailGeneratorService = require('./EmailGeneratorService');

class KafkaConsumerService {
  constructor() {
    this.kafka = null;
    this.consumer = null;
    this.isConnected = false;
    this.emailService = new EmailService();
    this.emailGeneratorService = new EmailGeneratorService();
  }

  /**
   * Initialize Kafka consumer
   * @returns {Promise<void>}
   */
  async initialize() {
    if (!kafkaConfig.enabled) {
      console.log('[WARN] Kafka is disabled');
      return;
    }

    try {
      this.kafka = new Kafka({
        clientId: kafkaConfig.clientId,
        brokers: kafkaConfig.brokers,
        connectionTimeout: kafkaConfig.connectionTimeout,
        requestTimeout: kafkaConfig.requestTimeout,
        retry: {
          initialRetryTime: kafkaConfig.retries.initialRetryTime,
          retries: kafkaConfig.retries.maxAttempts,
          maxRetryTime: kafkaConfig.retries.maxRetryTime,
          multiplier: kafkaConfig.retries.multiplier,
        },
      });

      this.consumer = this.kafka.consumer(kafkaConfig.consumer);
      await this.consumer.connect();
      this.isConnected = true;
      console.log('[OK] Kafka Consumer connected successfully');

      // Subscribe to email notifications topic
      await this.consumer.subscribe({
        topic: kafkaConfig.topics.emailNotifications,
        fromBeginning: false,
      });

      console.log(`[OK] Subscribed to topic: ${kafkaConfig.topics.emailNotifications}`);
    } catch (error) {
      console.error('[ERROR] Failed to connect Kafka Consumer:', error.message);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Start consuming and processing email notifications
   * @returns {Promise<void>}
   */
  async startConsuming() {
    if (!this.isConnected) {
      throw new Error('Consumer not connected. Call initialize() first.');
    }

    try {
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          await this.handleMessage(message);
        },
      });
      console.log('[OK] Email consumer started and listening for messages');
    } catch (error) {
      console.error('[ERROR] Error in consumer loop:', error.message);
      throw error;
    }
  }

  /**
   * Handle incoming email notification message
   * @param {Object} message - Kafka message
   * @returns {Promise<void>}
   */
  async handleMessage(message) {
    const startTime = Date.now();
    let emailData = null;

    try {
      emailData = JSON.parse(message.value.toString());
      console.log(`[OK] Processing email notification: ${emailData.id}`);

      // Sanitize email data
      emailData = this.emailGeneratorService.sanitizeEmailData(emailData);

      // Validate email data
      const validation = this.emailGeneratorService.validateEmailData(emailData);
      if (!validation.isValid) {
        throw new Error(`Invalid email data: ${validation.errors.join(', ')}`);
      }

      // Generate email content if not provided
      emailData = this.emailGeneratorService.generateEmailContent(emailData);

      // Send email
      const result = await this.emailService.sendEmail(emailData);

      const processingTime = Date.now() - startTime;
      console.log(`[OK] Email sent successfully: ${emailData.id} (${processingTime}ms)`);
      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(
        `[ERROR] Error processing email notification (${processingTime}ms):`,
        error.message
      );

      if (emailData) {
        const currentRetries = emailData.retries || 0;
        if (currentRetries >= kafkaConfig.retries.maxAttempts) {
          try {
            await this.sendToDLQ(emailData, error.message);
          } catch (dlqError) {
            console.error(`[ERROR] Failed to send email to DLQ (${emailData.id}):`, dlqError.message);
          }
        }
      }

      throw error;
    }
  }

  /**
   * Send failed email to Dead Letter Queue
   * @param {Object} emailData - Email data that failed
   * @param {string} errorMessage - Error message
   * @returns {Promise<void>}
   */
  async sendToDLQ(emailData, errorMessage) {
    try {
      const producer = this.kafka.producer();
      await producer.connect();

      await producer.send({
        topic: kafkaConfig.topics.emailDLQ,
        messages: [
          {
            key: `dlq-${emailData.id}`,
            value: JSON.stringify({
              ...emailData,
              failedAt: new Date().toISOString(),
              errorMessage: errorMessage,
              retries: (emailData.retries || 0) + 1,
            }),
            headers: {
              'event-type': 'email.failed',
              'source': 'email-sender-service',
              'error': errorMessage,
            },
          },
        ],
      });

      console.log(`[WARN] Email sent to DLQ: ${emailData.id}`);
      await producer.disconnect();
    } catch (error) {
      console.error('[ERROR] Error sending to DLQ:', error.message);
    }
  }

  /**
   * Disconnect the consumer
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (this.consumer && this.isConnected) {
      try {
        await this.consumer.disconnect();
        this.isConnected = false;
        console.log('[OK] Kafka Consumer disconnected');
      } catch (error) {
        console.error('[ERROR] Error disconnecting Kafka Consumer:', error.message);
        throw error;
      }
    }
  }

  /**
   * Check if consumer is connected
   * @returns {boolean}
   */
  isConsumerConnected() {
    return this.isConnected;
  }
}

module.exports = KafkaConsumerService;
