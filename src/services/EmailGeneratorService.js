/**
 * Email Generator Service
 * Generates email content based on event type
 */

const { generateComplaintNotificationTemplate, generateGenericTemplate } = require('../templates/emailTemplates');

class EmailGeneratorService {
  /**
   * Generate email content based on event data
   * @param {Object} emailData - Data from Kafka message
   * @returns {Object} Email with generated HTML if not provided
   */
  generateEmailContent(emailData) {
    try {
      // If HTML is already provided, use it
      if (emailData.html) {
        return emailData;
      }

      // Generate HTML based on event type or complaint data
      let html;
      if (emailData.complaintId || emailData.description) {
        html = generateComplaintNotificationTemplate(emailData);
      } else {
        html = generateGenericTemplate(emailData);
      }

      return {
        ...emailData,
        html,
      };
    } catch (error) {
      console.error('Error generating email content:', error.message);
      // Fallback to generic template
      return {
        ...emailData,
        html: generateGenericTemplate(emailData),
      };
    }
  }

  /**
   * Validate email data
   * @param {Object} emailData - Email data to validate
   * @returns {Object} Validation result
   */
  validateEmailData(emailData) {
    const errors = [];

    if (!emailData.to) {
      errors.push('Recipient email (to) is required');
    }

    if (!emailData.subject) {
      errors.push('Email subject is required');
    }

    if (!emailData.html && !emailData.message && !emailData.description) {
      errors.push('Email content (html, message, or description) is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Sanitize email data
   * @param {Object} emailData - Email data to sanitize
   * @returns {Object} Sanitized email data
   */
  sanitizeEmailData(emailData) {
    return {
      id: this._sanitizeString(emailData.id) || `email-${Date.now()}`,
      to: this._sanitizeEmail(emailData.to),
      cc: this._sanitizeEmailArray(emailData.cc),
      subject: this._sanitizeString(emailData.subject, 'Sin asunto'),
      html: emailData.html || null,
      priority: (emailData.priority || 'normal').toLowerCase(),
      metadata: this._sanitizeObject(emailData.metadata),
      fromName: this._sanitizeString(emailData.fromName, 'Sistema de Gestión de Quejas'),
      timestamp: emailData.timestamp || new Date().toISOString(),
      retries: parseInt(emailData.retries, 10) || 0,
      // Copy complaint-specific fields if available
      ...(emailData.complaintId && { complaintId: emailData.complaintId }),
      ...(emailData.description && { description: emailData.description }),
      ...(emailData.status && { status: emailData.status }),
      ...(emailData.entityName && { entityName: emailData.entityName }),
      ...(emailData.createdAt && { createdAt: emailData.createdAt }),
      ...(emailData.action && { action: emailData.action }),
      ...(emailData.title && { title: emailData.title }),
    };
  }

  /**
   * Sanitize a string value
   * @private
   * @param {*} value - Value to sanitize
   * @param {string} defaultValue - Default value if empty
   * @returns {string} Sanitized string
   */
  _sanitizeString(value, defaultValue = '') {
    if (!value) return defaultValue;
    return String(value).trim();
  }

  /**
   * Sanitize an email address
   * @private
   * @param {*} value - Email to sanitize
   * @returns {string} Sanitized email
   */
  _sanitizeEmail(value) {
    if (!value) return '';
    return String(value).trim().toLowerCase();
  }

  /**
   * Sanitize array of emails
   * @private
   * @param {*} value - Email(s) to sanitize
   * @returns {Array} Array of sanitized emails
   */
  _sanitizeEmailArray(value) {
    if (Array.isArray(value)) {
      return value
        .map(email => String(email).trim().toLowerCase())
        .filter(email => email.length > 0);
    }
    if (value) {
      return [String(value).trim().toLowerCase()];
    }
    return [];
  }

  /**
   * Sanitize an object
   * @private
   * @param {*} value - Object to sanitize
   * @returns {Object} Sanitized object
   */
  _sanitizeObject(value) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return value;
    }
    return {};
  }
}

module.exports = EmailGeneratorService;
