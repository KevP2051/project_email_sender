/**
 * Email Service
 * Sends emails via Gmail transporter
 * Receives email data already processed by EmailGeneratorService
 */

const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
    this.initialize();
  }

  /**
   * Initialize email service with configuration validation and transporter setup
   * @throws {Error} If required env vars are missing
   */
  initialize() {
    try {
      this.validateConfiguration();
      this.initializeTransporter();
      this.initialized = true;
    } catch (error) {
      console.error('[ERROR] Failed to initialize Email Service: ', error.message);
      throw error;
    }
  }

  /**
   * Validate that required email configuration is present
   * @throws {Error} If required env vars are missing
   */
  validateConfiguration() {
    const requiredVars = ['EMAIL_USER', 'EMAIL_PASSWORD'];
    const missing = requiredVars.filter((v) => !process.env[v]);

    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  /**
   * Initialize the Nodemailer transporter with Gmail
   */
  initializeTransporter() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      pool: {
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 1000,
        rateLimit: 5,
      },
    });

    console.log('[OK] Email transporter initialized (Gmail)');
  }

  /**
   * Send email
   * @param {Object} emailData - Processed email data from Kafka
   * @returns {Promise<Object>} Success status and message ID
   * @throws {Error} If email sending fails
   */
  async sendEmail(emailData) {
    // Validate service initialization
    if (!this.initialized) {
      throw new Error('Email Service not initialized');
    }

    // Validate required email data
    const requiredFields = ['to', 'subject', 'html'];
    const missingFields = requiredFields.filter(field => !emailData[field]);
    if (missingFields.length > 0) {
      throw new Error(`Email data missing required fields: ${missingFields.join(', ')}`);
    }

    try {
      // Build mail options with proper defaults
      const mailOptions = this._buildMailOptions(emailData);

      // Send email
      const info = await this.transporter.sendMail(mailOptions);

      console.log(`[OK] Email sent successfully: ${info.messageId} (ID: ${emailData.id})`);
      return {
        success: true,
        messageId: info.messageId,
        eventId: emailData.id,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`[ERROR] Error sending email (${emailData.id}):`, error.message);
      throw error;
    }
  }

  /**
   * Build mail options from email data
   * @private
   * @param {Object} emailData - Email data
   * @returns {Object} Mail options for nodemailer
   */
  _buildMailOptions(emailData) {
    const mailOptions = {
      from: {
        name: emailData.fromName || 'Sistema de Gestión de Quejas',
        address: process.env.EMAIL_USER,
      },
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html,
      priority: emailData.priority || 'normal',
      headers: {
        'X-Mailer': 'Email Sender Service v1.0',
        'X-Service': 'complaints-email-service',
        'X-Event-ID': emailData.id,
      },
    };

    // Add CC recipients if available
    if (emailData.cc && Array.isArray(emailData.cc) && emailData.cc.length > 0) {
      mailOptions.cc = emailData.cc;
    }

    // Add custom headers from metadata if provided
    if (emailData.metadata?.customHeaders && typeof emailData.metadata.customHeaders === 'object') {
      Object.assign(mailOptions.headers, emailData.metadata.customHeaders);
    }

    return mailOptions;
  }

  /**
   * Send test email
   * @param {string} to - Recipient email
   * @returns {Promise<Object>} Mail info
   */
  async sendTestEmail(to = 'test@example.com') {
    try {
      const mailOptions = {
        from: {
          name: 'Email Sender Service - Test',
          address: process.env.EMAIL_USER,
        },
        to: to,
        subject: 'Test Email - Email Sender Service',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Email Service Test Successful</h2>
            <p>This email confirms that the email sending service is working correctly.</p>
            <p><strong>Service:</strong> Email Sender Service</p>
            <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Mode:</strong> Kafka Consumer</p>
            <hr>
            <p style="color: #666; font-size: 12px;">
              This is an automated message. Please do not reply.
            </p>
          </div>
        `,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`[OK] Test email sent: ${info.messageId}`);
      return info;
    } catch (error) {
      console.error('[ERROR] Error sending test email:', error.message);
      throw error;
    }
  }

  /**
   * Check transporter health
   * @returns {Promise<boolean>}
   */
  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('[OK] Transporter verified successfully');
      return true;
    } catch (error) {
      console.error('[ERROR] Transporter verification failed:', error.message);
      return false;
    }
  }

  /**
   * Get transporter info
   * @returns {Object}
   */
  getInfo() {
    return {
      service: 'gmail',
      user: process.env.EMAIL_USER,
      connected: !!this.transporter,
    };
  }
}

module.exports = EmailService;
