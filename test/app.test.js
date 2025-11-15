/**
 * Tests de Lógica de Negocio del Email Sender Service
 */

process.env.EMAIL_USER = 'test@example.com';
process.env.EMAIL_PASSWORD = 'test_password';
process.env.KAFKA_ENABLED = 'false';

const EmailGeneratorService = require('../src/services/EmailGeneratorService');
const EmailService = require('../src/services/EmailService');

describe('Sistema de Notificación - Consulta de Listado de Quejas', () => {
  let emailGenerator;
  let emailService;
 
  beforeEach(() => {
    emailGenerator = new EmailGeneratorService();
    emailService = new EmailService();
  });

  // Validación de evento de consulta del listado
  describe('Validación de evento de consulta del listado completo', () => {
    test('debe validar evento cuando usuario consulta todas las quejas', () => {
      const eventoConsulta = {
        to: 'admin@example.com',
        subject: 'Consulta de Listado de Quejas',
        description: 'Usuario consultó el listado completo de quejas del sistema',
      };

      const validation = emailGenerator.validateEmailData(eventoConsulta);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('debe rechazar evento sin destinatario', () => {
      const eventoConsulta = {
        subject: 'Consulta de Listado',
        description: 'Consulta realizada',
      };

      const validation = emailGenerator.validateEmailData(eventoConsulta);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Recipient email (to) is required');
    });

    test('debe validar que el email tenga destinatario y emisor al enviar', async () => {
      const mockSendMail = jest.fn().mockResolvedValue({
        messageId: '<validation-test@gmail.com>',
        accepted: ['admin@example.com'],
      });
      emailService.transporter.sendMail = mockSendMail;

      const eventoNotificacion = {
        to: 'admin@example.com',
        subject: 'Acceso al Listado de Quejas',
        html: '<p>Notificación de acceso</p>',
      };

      await emailService.sendEmail(eventoNotificacion);

      // Verificar que el email enviado tiene destinatario y emisor
      const emailEnviado = mockSendMail.mock.calls[0][0];
      
      // Validar destinatario
      expect(emailEnviado.to).toBeDefined();
      expect(emailEnviado.to).toBe('admin@example.com');
      
      // Validar emisor (from) - es un objeto con address y name
      expect(emailEnviado.from).toBeDefined();
      expect(emailEnviado.from.address).toBe('test@example.com'); // EMAIL_USER del env
      expect(emailEnviado.from.name).toBe('Sistema de Gestión de Quejas');
    });
  });

  // Procesamiento del evento
  describe('Procesamiento de evento de consulta del listado', () => {
    test('debe sanitizar datos del evento de consulta de listado', () => {
      const eventoKafka = {
        to: '  ADMIN@EXAMPLE.COM  ',
        subject: 'Consulta del listado de quejas',
        description: 'Se accedió a la pantalla de consulta de quejas',
        priority: 'NORMAL',
      };

      const sanitized = emailGenerator.sanitizeEmailData(eventoKafka);

      expect(sanitized.to).toBe('admin@example.com');
      expect(sanitized.priority).toBe('normal');
    });

    test('debe generar contenido HTML para notificación genérica de consulta', () => {
      const eventoConsulta = {
        subject: 'Consulta de Quejas',
        message: 'Se consultó el listado completo de quejas',
      };

      const resultado = emailGenerator.generateEmailContent(eventoConsulta);

      expect(resultado.html).toBeDefined();
      expect(resultado.html).toContain('Sistema de Notificaciones');
    });
  });

  // Envío de notificación por consulta del listado
  describe('Envío de notificación cuando se consulta el listado de quejas', () => {
    test('debe enviar notificación exitosamente cuando usuario accede al listado', async () => {
      const mockSendMail = jest.fn().mockResolvedValue({
        messageId: '<notif-listado@gmail.com>',
        accepted: ['admin@example.com'],
        response: '250 OK',
      });
      emailService.transporter.sendMail = mockSendMail;

      const eventoConsulta = {
        id: 'NOTIF-LISTADO-001',
        to: 'admin@example.com',
        subject: 'Acceso al Listado de Quejas',
        message: 'Usuario accedió a la pantalla de consulta de quejas',
        html: '<h1>Listado consultado</h1>',
      };

      const resultado = await emailService.sendEmail(eventoConsulta);

      expect(resultado.success).toBe(true);
      expect(resultado.messageId).toBe('<notif-listado@gmail.com>');
      expect(mockSendMail).toHaveBeenCalledTimes(1);
    });

    test('debe incluir información de la consulta en el email enviado', async () => {
      const mockSendMail = jest.fn().mockResolvedValue({
        messageId: '<test@gmail.com>',
      });
      emailService.transporter.sendMail = mockSendMail;

      const eventoConsulta = {
        to: 'supervisor@example.com',
        subject: 'Notificación: Consulta de Listado de Quejas',
        message: 'Se accedió al listado completo de quejas del sistema',
        html: '<p>Consulta realizada</p>',
      };

      await emailService.sendEmail(eventoConsulta);

      const emailEnviado = mockSendMail.mock.calls[0][0];
      expect(emailEnviado.to).toBe('supervisor@example.com');
      expect(emailEnviado.subject).toBe('Notificación: Consulta de Listado de Quejas');
      expect(emailEnviado.html).toContain('Consulta realizada');
    });

    test('debe manejar error al enviar notificación', async () => {
      const mockSendMail = jest.fn().mockRejectedValue(
        new Error('No se pudo conectar al servidor SMTP')
      );
      emailService.transporter.sendMail = mockSendMail;

      const eventoConsulta = {
        to: 'admin@example.com',
        subject: 'Consulta de Listado',
        html: '<p>Test</p>',
      };

      await expect(emailService.sendEmail(eventoConsulta))
        .rejects.toThrow('No se pudo conectar al servidor SMTP');
    });
  });

  describe('Flujo completo: Usuario accede al listado -> Notificación por email', () => {
    test('debe procesar evento completo cuando usuario consulta el listado de quejas', async () => {
      const mockSendMail = jest.fn().mockResolvedValue({
        messageId: '<listado-final@gmail.com>',
        accepted: ['admin@example.com', 'supervisor@example.com'],
      });
      emailService.transporter.sendMail = mockSendMail;

      // 1. Evento desde Kafka (usuario hizo click en "Consultar Quejas")
      const eventoKafka = {
        id: 'EVENT-LISTADO-001',
        to: '  ADMIN@EXAMPLE.COM  ',
        cc: ['supervisor@example.com'],
        subject: 'Acceso al Listado de Quejas del Sistema',
        description: 'Usuario accedió a la pantalla de consulta del listado completo de quejas',
        priority: 'NORMAL',
        timestamp: new Date().toISOString(),
      };

      // 2. Sanitizar datos del evento
      const sanitized = emailGenerator.sanitizeEmailData(eventoKafka);
      expect(sanitized.to).toBe('admin@example.com');
      expect(sanitized.priority).toBe('normal');

      // 3. Validar datos
      const validation = emailGenerator.validateEmailData(sanitized);
      expect(validation.isValid).toBe(true);

      // 4. Generar contenido del email
      const conHTML = emailGenerator.generateEmailContent(sanitized);
      expect(conHTML.html).toBeDefined();

      // 5. Enviar notificación por email
      const resultado = await emailService.sendEmail(conHTML);

      // Verificaciones
      expect(resultado.success).toBe(true);
      expect(mockSendMail).toHaveBeenCalledTimes(1);

      const emailFinal = mockSendMail.mock.calls[0][0];
      expect(emailFinal.to).toBe('admin@example.com');
      expect(emailFinal.cc).toEqual(['supervisor@example.com']);
      expect(emailFinal.priority).toBe('normal');
    });
  });

  // Generación de HTML del correo para notificación de acceso al listado
  describe('Generación del HTML del correo electrónico', () => {
    test('debe generar HTML completo con estructura válida para notificación de acceso', async () => {
      const mockSendMail = jest.fn().mockResolvedValue({
        messageId: '<html-test@gmail.com>',
        accepted: ['admin@example.com'],
      });
      emailService.transporter.sendMail = mockSendMail;

      const eventoAccesoListado = {
        to: 'admin@example.com',
        subject: 'Notificación: Acceso al Listado de Quejas',
        message: 'Usuario ha accedido a la pantalla de consulta del listado completo de quejas del sistema',
      };

      // Generar HTML desde el servicio
      const emailConHTML = emailGenerator.generateEmailContent(eventoAccesoListado);

      // Verificar que se generó HTML
      expect(emailConHTML.html).toBeDefined();
      expect(emailConHTML.html).toContain('<!DOCTYPE html>');
      expect(emailConHTML.html).toContain('<html lang="es">');
      
      // Verificar que contiene el mensaje de acceso al listado
      expect(emailConHTML.html).toContain('Usuario ha accedido a la pantalla de consulta del listado completo de quejas');
      expect(emailConHTML.html).toContain('Sistema de Notificaciones');

      // Verificar que contiene estilos CSS
      expect(emailConHTML.html).toContain('<style>');
      expect(emailConHTML.html).toContain('font-family');
      expect(emailConHTML.html).toContain('background-color');

      // Enviar el email con HTML generado
      const resultado = await emailService.sendEmail(emailConHTML);

      // Verificar que el email se envió exitosamente
      expect(resultado.success).toBe(true);
      expect(mockSendMail).toHaveBeenCalledTimes(1);

      // Verificar que el mock recibió el HTML completo
      const emailEnviado = mockSendMail.mock.calls[0][0];
      expect(emailEnviado.html).toBeDefined();
      expect(emailEnviado.html).toContain('<!DOCTYPE html>');
      expect(emailEnviado.html).toContain('Sistema de Notificaciones');
      expect(emailEnviado.html).toContain('Usuario ha accedido a la pantalla de consulta del listado completo de quejas');
    });

    test('debe enviar email con HTML cuando usuario consulta el listado completo', async () => {
      const mockSendMail = jest.fn().mockResolvedValue({
        messageId: '<listado-html@gmail.com>',
        accepted: ['supervisor@example.com'],
      });
      emailService.transporter.sendMail = mockSendMail;

      const eventoConsultaListado = {
        to: 'supervisor@example.com',
        subject: 'Acceso al Sistema de Quejas',
        description: 'Se consultó el listado completo de quejas en el sistema',
      };

      // Generar HTML
      const emailConHTML = emailGenerator.generateEmailContent(eventoConsultaListado);

      // Verificar estructura HTML básica
      expect(emailConHTML.html).toBeDefined();
      expect(emailConHTML.html).toContain('<!DOCTYPE html>');
      expect(emailConHTML.html).toContain('Se consultó el listado completo de quejas en el sistema');

      // Enviar email
      await emailService.sendEmail(emailConHTML);

      // Verificar que el HTML fue enviado correctamente
      const emailEnviado = mockSendMail.mock.calls[0][0];
      expect(emailEnviado.html).toContain('Se consultó el listado completo de quejas en el sistema');
      expect(emailEnviado.subject).toBe('Acceso al Sistema de Quejas');
    });
  });
});
