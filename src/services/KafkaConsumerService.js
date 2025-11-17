/**
 * Kafka Consumer Service
 * Consumes email notification events from Kafka and processes them
 */

const { Kafka } = require('kafkajs');
const kafkaConfig = require('../config/kafkaConfig');
const EmailService = require('./EmailService');
const EmailGeneratorService = require('./EmailGeneratorService');
const { 
  logKafkaEvent, 
  logBusinessEvent, 
  logMessageQueue, 
  logError,
  logger 
} = require('../utils/logger');

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
      logger.warn('Kafka is disabled', { service: 'email-sender-service' });
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
      logger.info('Kafka Consumer connected successfully', {
        service: 'email-sender-service',
        clientId: kafkaConfig.clientId,
        brokers: kafkaConfig.brokers
      });

      // Subscribe to email notifications topic
      await this.consumer.subscribe({
        topic: kafkaConfig.topics.emailNotifications,
        fromBeginning: false,
      });

      logger.info('Subscribed to Kafka topic', {
        service: 'email-sender-service',
        topic: kafkaConfig.topics.emailNotifications
      });
    } catch (error) {
      logError(error, {
        operation: 'initialize',
        service: 'email-sender-service'
      });
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
          await this.handleMessage(message, topic, partition);
        },
      });
      logger.info('Email consumer started and listening for messages', {
        service: 'email-sender-service',
        topic: kafkaConfig.topics.emailNotifications
      });
    } catch (error) {
      logError(error, {
        operation: 'startConsuming',
        service: 'email-sender-service'
      });
      throw error;
    }
  }

  /**
   * Handle incoming email notification message
   * @param {Object} message - Kafka message
   * @param {string} topic - Kafka topic
   * @param {number} partition - Partition number
   * @returns {Promise<void>}
   */
  async handleMessage(message, topic, partition) {
    const startTime = Date.now();
    let emailData = null;
    let correlationId = null;

    try {
      // Extract correlation ID from headers
      if (message.headers && message.headers['x-correlation-id']) {
        correlationId = message.headers['x-correlation-id'].toString();
      }

      emailData = JSON.parse(message.value.toString());

      // If no correlation ID in headers, try to get it from email data
      if (!correlationId && emailData.correlationId) {
        correlationId = emailData.correlationId;
      }

      logKafkaEvent(
        'CONSUMED',
        topic,
        {
          partition,
          offset: message.offset,
          emailId: emailData.id,
          eventType: 'Solicitud de envío de email recibida desde Kafka'
        },
        correlationId
      );

      logMessageQueue(
        'CONSUMED',
        'EMAIL_SEND',
        {
          emailId: emailData.id,
          to: emailData.to,
          subject: emailData.subject,
          description: `Email en cola para envío a ${emailData.to} - Asunto: "${emailData.subject}"`
        },
        correlationId
      );

      logBusinessEvent(
        'EMAIL_CONSUMIDO_KAFKA',
        {
          topic,
          partition,
          offset: message.offset,
          emailId: emailData.id,
          to: emailData.to,
          description: `Evento de email consumido desde Kafka para ${emailData.to}`
        },
        correlationId,
        'email-sender-service'
      );

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
      const result = await this.emailService.sendEmail(emailData, correlationId);

      const processingTime = Date.now() - startTime;
      logBusinessEvent(
        'EMAIL_ENVIADO_EXITOSO',
        {
          emailId: emailData.id,
          to: emailData.to,
          messageId: result.messageId,
          processingTimeMs: processingTime,
          description: `Email enviado exitosamente a ${emailData.to}. ID del mensaje: ${result.messageId}. Tiempo: ${processingTime}ms`
        },
        correlationId,
        'email-sender-service'
      );

      logMessageQueue(
        'PROCESSED',
        'EMAIL_SEND',
        {
          emailId: emailData.id,
          to: emailData.to,
          status: 'SUCCESS',
          processingTimeMs: processingTime
        },
        correlationId
      );

      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logError(error, {
        operation: 'handleMessage',
        service: 'email-sender-service',
        topic,
        partition,
        offset: message.offset,
        processingTimeMs: processingTime,
        emailId: emailData?.id,
        emailTo: emailData?.to
      }, correlationId);

      logMessageQueue(
        'FAILED',
        'EMAIL_SEND',
        {
          emailId: emailData?.id,
          error: error.message,
          processingTimeMs: processingTime
        },
        correlationId
      );

      if (emailData) {
        const currentRetries = emailData.retries || 0;
        if (currentRetries >= kafkaConfig.retries.maxAttempts) {
          try {
            await this.sendToDLQ(emailData, error.message, correlationId);
          } catch (dlqError) {
            logError(dlqError, {
              operation: 'sendToDLQ',
              service: 'email-sender-service',
              emailId: emailData.id
            }, correlationId);
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
   * @param {string} correlationId - Correlation ID for logging
   * @returns {Promise<void>}
   */
  async sendToDLQ(emailData, errorMessage, correlationId = null) {
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
              'x-correlation-id': correlationId || '',
            },
          },
        ],
      });

      logger.warn('Email sent to DLQ', {
        service: 'email-sender-service',
        emailId: emailData.id,
        errorMessage
      });

      logKafkaEvent(
        'PRODUCED',
        kafkaConfig.topics.emailDLQ,
        {
          emailId: emailData.id,
          errorMessage,
          eventType: 'email.failed'
        },
        correlationId
      );

      await producer.disconnect();
    } catch (error) {
      logError(error, {
        operation: 'sendToDLQ',
        service: 'email-sender-service',
        emailId: emailData.id
      }, correlationId);
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
        logger.info('Kafka Consumer disconnected', {
          service: 'email-sender-service'
        });
      } catch (error) {
        logError(error, {
          operation: 'disconnect',
          service: 'email-sender-service'
        });
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
