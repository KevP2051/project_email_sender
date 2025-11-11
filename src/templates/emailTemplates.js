/**
 * Email Templates
 * HTML templates for different types of email notifications
 */

const generateComplaintNotificationTemplate = (data) => {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f4f4f4;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 20px auto;
          background-color: #fff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px 20px;
          text-align: center;
        }
        .header h2 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
        }
        .content {
          padding: 30px;
        }
        .content h3 {
          color: #333;
          margin-top: 0;
          margin-bottom: 20px;
          font-size: 18px;
        }
        .detail-row {
          margin-bottom: 15px;
          padding: 12px;
          background-color: #f8f9fa;
          border-left: 4px solid #667eea;
          border-radius: 4px;
        }
        .detail-row strong {
          color: #555;
          display: block;
          margin-bottom: 5px;
          font-weight: 600;
        }
        .detail-row span {
          color: #333;
          word-break: break-word;
        }
        .status-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 20px;
          font-weight: 600;
          font-size: 12px;
        }
        .status-open {
          background-color: #d4edda;
          color: #155724;
        }
        .status-review {
          background-color: #fff3cd;
          color: #856404;
        }
        .status-closed {
          background-color: #d1ecf1;
          color: #0c5460;
        }
        .footer {
          background-color: #f8f9fa;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #777;
          border-top: 1px solid #eee;
        }
        .footer p {
          margin: 5px 0;
        }
        .timestamp {
          background-color: #e3f2fd;
          color: #1976d2;
          padding: 8px 12px;
          border-radius: 15px;
          font-weight: 600;
          display: inline-block;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>📋 Sistema de Gestión de Quejas</h2>
        </div>
        <div class="content">
          <h3>${data.title || 'Notificación de Queja'}</h3>

          <div class="detail-row">
            <strong>ID de Queja:</strong>
            <span>${data.complaintId || 'N/A'}</span>
          </div>

          <div class="detail-row">
            <strong>Descripción:</strong>
            <span>${data.description || 'N/A'}</span>
          </div>

          <div class="detail-row">
            <strong>Entidad:</strong>
            <span>${data.entityName || 'N/A'}</span>
          </div>

          <div class="detail-row">
            <strong>Estado:</strong>
            <span class="status-badge status-${data.status || 'open'}">
              ${(data.status === 'abierta' && 'Abierta') || (data.status === 'en_revision' && 'En Revisión') || (data.status === 'cerrada' && 'Cerrada') || 'Pendiente'}
            </span>
          </div>

          <div class="detail-row">
            <strong>Fecha de Creación:</strong>
            <span class="timestamp">${new Date(data.createdAt).toLocaleString('es-CO', { timeZone: 'America/Bogota' }) || 'N/A'}</span>
          </div>

          ${data.action ? `
            <div class="detail-row">
              <strong>Acción:</strong>
              <span>${data.action}</span>
            </div>
          ` : ''}

          ${data.metadata && data.metadata.ip ? `
            <div class="detail-row">
              <strong>Información Técnica:</strong>
              <span>IP: ${data.metadata.ip} | ${data.metadata.userAgent ? 'Navegador: ' + data.metadata.userAgent : ''}</span>
            </div>
          ` : ''}
        </div>
        <div class="footer">
          <p>✉️ Este es un mensaje automático del sistema de gestión de quejas.</p>
          <p>Por favor, no responda a este correo.</p>
          <p style="margin-top: 15px; border-top: 1px solid #eee; padding-top: 15px;">
            © ${new Date().getFullYear()} Sistema de Gestión de Quejas. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const generateGenericTemplate = (data) => {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f4f4f4;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 20px auto;
          background-color: #fff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px 20px;
          text-align: center;
        }
        .header h2 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
        }
        .content {
          padding: 30px;
        }
        .content h3 {
          color: #333;
          margin-top: 0;
          margin-bottom: 20px;
          font-size: 18px;
        }
        .message {
          background-color: #f8f9fa;
          padding: 15px;
          border-left: 4px solid #667eea;
          border-radius: 4px;
          margin-bottom: 20px;
          line-height: 1.8;
        }
        .footer {
          background-color: #f8f9fa;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #777;
          border-top: 1px solid #eee;
        }
        .footer p {
          margin: 5px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>${data.fromName || 'Sistema de Notificaciones'}</h2>
        </div>
        <div class="content">
          <h3>${data.title || 'Notificación'}</h3>
          <div class="message">
            ${data.message || data.content || 'Contenido de la notificación'}
          </div>
        </div>
        <div class="footer">
          <p>✉️ Este es un mensaje automático.</p>
          <p>Por favor, no responda a este correo.</p>
          <p style="margin-top: 15px; border-top: 1px solid #eee; padding-top: 15px;">
            © ${new Date().getFullYear()} Sistema Automatizado. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = {
  generateComplaintNotificationTemplate,
  generateGenericTemplate,
};
