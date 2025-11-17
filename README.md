# Email Sender Service

Microservicio dedicado al envío de emails que consume eventos de notificación desde Kafka y envía los correos electrónicos correspondientes.

## 📋 Descripción

Este servicio forma parte de una arquitectura de microservicios desacoplada. Consume eventos de email desde el topic `email-notifications` de Kafka, procesa los datos, genera el contenido HTML si es necesario, y envía los emails usando nodemailer (Gmail).

## 🏗️ Arquitectura

```
┌─────────────────────┐
│  project_complaints │
│   (Producer)        │
└──────────┬──────────┘
           │
           │ Publica eventos
           │ a Kafka
           ▼
    ┌──────────────┐
    │    Kafka     │
    │  Topic:      │
    │email-notif...│
    └──────┬───────┘
           │
           │ Consume eventos
           ▼
┌─────────────────────┐
│ project_email_sender│
│   (Consumer)        │
└─────────────────────┘
```

## ✨ Características

- **Consumo asíncrono**: Procesa emails de forma asíncrona sin bloquear otros servicios
- **Generación automática de HTML**: Genera templates HTML si no se proporciona contenido
- **Manejo de errores robusto**: Reintentos automáticos y Dead Letter Queue (DLQ)
- **Validación de datos**: Valida y sanitiza datos antes de enviar
- **Health checks**: Endpoints para monitoreo del servicio
- **Escalabilidad**: Puede escalarse horizontalmente usando consumer groups

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 14+
- Kafka corriendo (ver `docker-compose.yml` en la raíz del proyecto)
- Cuenta de Gmail con contraseña de aplicación

### Instalación

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales
```

### Configuración

Crear archivo `.env`:

```env
# Kafka Configuration
KAFKA_ENABLED=true
KAFKA_BROKERS=localhost:9092

# Email Configuration (Gmail)
EMAIL_USER=tu-email@gmail.com
EMAIL_PASSWORD=tu-contraseña-de-aplicacion

# Server Configuration
PORT=3032
```

### Ejecución

```bash
# Desarrollo (con nodemon)
npm run dev

# Producción
npm start
```

## 📡 API Endpoints

### Health Check

**GET** `/health`

Verifica el estado del servicio, conexión a Kafka y configuración de email.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-12-10T15:30:00.000Z",
  "service": "email-sender",
  "kafka": true,
  "email": {
    "service": "gmail",
    "user": "tu-email@gmail.com",
    "connected": true
  }
}
```

### Ready Check

**GET** `/ready`

Verifica si el servicio está listo para procesar mensajes (Kafka conectado).

**Response:**
```json
{
  "ready": true
}
```

### Test Email

**POST** `/test-email`

Envía un email de prueba (útil para verificar configuración).

**Request Body:**
```json
{
  "to": "destinatario@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Test email sent successfully",
  "messageId": "<message-id@mail.gmail.com>"
}
```

## 🔧 Configuración de Kafka

### Variables de Entorno

| Variable | Descripción | Valor por Defecto | Requerido |
|----------|-------------|-------------------|-----------|
| `KAFKA_ENABLED` | Habilita/deshabilita Kafka | `false` | No |
| `KAFKA_BROKERS` | Brokers de Kafka (comma-separated) | `localhost:9092` | No |
| `EMAIL_USER` | Email de Gmail | - | Sí |
| `EMAIL_PASSWORD` | Contraseña de aplicación Gmail | - | Sí |
| `PORT` | Puerto del servidor | `3032` | No |

### Configuración Avanzada

Los valores de timeout y retry pueden configurarse editando `src/config/kafkaConfig.js`:

```javascript
module.exports = {
  connectionTimeout: 10000,  // ms
  requestTimeout: 30000,      // ms
  retries: {
    maxAttempts: 3,
    initialRetryTime: 100,    // ms
    maxRetryTime: 30000,      // ms
    multiplier: 2,
  },
  consumer: {
    sessionTimeout: 30000,    // ms
    rebalanceTimeout: 60000,  // ms
    heartbeatInterval: 3000,  // ms
  },
};
```

## 📨 Formato de Mensajes Kafka

El servicio espera mensajes en el siguiente formato:

```json
{
  "id": "email-complaint-123-1234567890",
  "timestamp": "2024-12-10T15:30:00.000Z",
  "to": "destinatario@example.com",
  "cc": ["cc1@example.com", "cc2@example.com"],
  "subject": "Notificación de Queja #123",
  "html": "<html>...</html>",  // Opcional, se genera si no está presente
  "title": "Queja #123 - Entidad",
  "fromName": "Sistema de Gestión de Quejas",
  "priority": "high",
  "retries": 0,
  "metadata": {
    "eventType": "complaint.created",
    "source": "complaints-service"
  },
  "complaintId": 123,
  "description": "Descripción de la queja",
  "status": "abierta",
  "entityName": "Entidad Pública",
  "createdAt": "2024-12-10T15:30:00.000Z",
  "action": "Nueva queja registrada"
}
```

### Campos Requeridos

- `id`: ID único del email
- `to`: Destinatario principal
- `subject`: Asunto del email

### Campos Opcionales

- `html`: Contenido HTML (se genera automáticamente si no está presente)
- `cc`: Destinatarios en copia
- `title`: Título del email
- `fromName`: Nombre del remitente
- `priority`: Prioridad (`normal` o `high`)
- Campos específicos de quejas (`complaintId`, `description`, etc.)

## 🔄 Flujo de Procesamiento

1. **Consumo**: El servicio consume mensajes del topic `email-notifications`
2. **Sanitización**: Los datos se sanitizan y validan
3. **Generación de HTML**: Si no hay HTML, se genera usando templates
4. **Envío**: Se envía el email usando nodemailer
5. **Manejo de Errores**: Si falla, se reintenta hasta 3 veces
6. **DLQ**: Si falla después de los reintentos, se envía a `email-dlq`

## 🛠️ Estructura del Proyecto

```
project_email_sender/
├── package.json
├── README.md
├── .env.example
└── src/
    ├── app.js                    # Punto de entrada
    ├── config/
    │   └── kafkaConfig.js       # Configuración de Kafka
    ├── services/
    │   ├── KafkaConsumerService.js    # Consumidor de Kafka
    │   ├── EmailService.js            # Envío de emails
    │   └── EmailGeneratorService.js   # Generación de HTML
    └── templates/
        └── emailTemplates.js     # Templates HTML
```

## 📝 Ejemplo de Implementación Kafka

### Configuración Básica

```javascript
// src/config/kafkaConfig.js
module.exports = {
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  clientId: 'email-sender-service',
  connectionTimeout: 10000,
  requestTimeout: 30000,
  consumer: {
    allowAutoTopicCreation: false,
    groupId: 'email-sender-service-group',
    sessionTimeout: 30000,
    rebalanceTimeout: 60000,
    heartbeatInterval: 3000,
  },
  topics: {
    emailNotifications: 'email-notifications',
    emailDLQ: 'email-dlq',
  },
  retries: {
    maxAttempts: 3,
    initialRetryTime: 100,
    maxRetryTime: 30000,
    multiplier: 2,
  },
  enabled: process.env.KAFKA_ENABLED === 'true',
};
```

### Inicialización del Consumer

```javascript
// src/services/KafkaConsumerService.js
const { Kafka } = require('kafkajs');
const kafkaConfig = require('../config/kafkaConfig');

class KafkaConsumerService {
  constructor() {
    this.kafka = null;
    this.consumer = null;
    this.isConnected = false;
  }

  async initialize() {
    if (!kafkaConfig.enabled) {
      console.log('[WARN] Kafka is disabled');
      return;
    }

    try {
      // Crear instancia de Kafka
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

      // Crear consumer
      this.consumer = this.kafka.consumer(kafkaConfig.consumer);

      // Conectar
      await this.consumer.connect();
      this.isConnected = true;
      console.log('[OK] Kafka Consumer connected successfully');

      // Suscribirse al topic
      await this.consumer.subscribe({
        topic: kafkaConfig.topics.emailNotifications,
        fromBeginning: false, // Solo leer mensajes nuevos
      });

      console.log(`[OK] Subscribed to topic: ${kafkaConfig.topics.emailNotifications}`);
    } catch (error) {
      console.error('[ERROR] Failed to connect Kafka Consumer:', error.message);
      this.isConnected = false;
      throw error;
    }
  }

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

  async handleMessage(message) {
    try {
      // Parsear mensaje
      const emailData = JSON.parse(message.value.toString());
      console.log(`[OK] Processing email notification: ${emailData.id}`);

      // Procesar y enviar email
      // ... lógica de procesamiento ...

    } catch (error) {
      console.error('[ERROR] Error processing message:', error.message);
      // Manejar error (reintentos, DLQ, etc.)
    }
  }

  async disconnect() {
    if (this.consumer && this.isConnected) {
      await this.consumer.disconnect();
      this.isConnected = false;
      console.log('[OK] Kafka Consumer disconnected');
    }
  }
}

module.exports = KafkaConsumerService;
```

### Uso en app.js

```javascript
// src/app.js
const KafkaConsumerService = require('./services/KafkaConsumerService');

let kafkaConsumer = null;

async function startService() {
  try {
    // Inicializar Kafka Consumer
    if (process.env.KAFKA_ENABLED === 'true') {
      kafkaConsumer = new KafkaConsumerService();
      await kafkaConsumer.initialize();
      await kafkaConsumer.startConsuming();
      console.log('[OK] Kafka consumer initialized and started');
    }

    // Iniciar servidor Express
    app.listen(PORT, () => {
      console.log(`[OK] Email Sender Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('[ERROR] Failed to start service:', error.message);
    process.exit(1);
  }
}

// Manejo de shutdown graceful
const gracefulShutdown = async () => {
  console.log('[INFO] Shutting down gracefully...');
  if (kafkaConsumer && kafkaConsumer.isConsumerConnected()) {
    await kafkaConsumer.disconnect();
  }
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

startService();
```

## 🧪 Testing

### Test Manual con cURL

```bash
# Health check
curl http://localhost:3032/health

# Test email
curl -X POST http://localhost:3032/test-email \
  -H "Content-Type: application/json" \
  -d '{"to": "test@example.com"}'
```

### Verificar Consumo de Kafka

```bash
# Ver mensajes en el topic
docker-compose exec kafka kafka-console-consumer \
  --bootstrap-server kafka:29092 \
  --topic email-notifications \
  --from-beginning
```

## 🐛 Troubleshooting

### Kafka no se conecta

1. Verificar que Kafka esté corriendo:
   ```bash
   docker-compose ps
   ```

2. Verificar que el topic existe:
   ```bash
   docker-compose exec kafka kafka-topics --list --bootstrap-server kafka:29092
   ```

3. Verificar variables de entorno:
   ```bash
   echo $KAFKA_BROKERS
   echo $KAFKA_ENABLED
   ```

### Emails no se envían

1. Verificar credenciales de Gmail en `.env`
2. Verificar logs del servicio
3. Verificar que los mensajes lleguen a Kafka
4. Revisar DLQ para mensajes fallidos

### Consumer no procesa mensajes

1. Verificar que el consumer group esté activo
2. Verificar offsets del consumer:
   ```bash
   docker-compose exec kafka kafka-consumer-groups \
     --bootstrap-server kafka:29092 \
     --group email-sender-service-group \
     --describe
   ```

## 📚 Dependencias Principales

- **kafkajs**: Cliente Kafka para Node.js
- **nodemailer**: Envío de emails
- **express**: Servidor HTTP para health checks
- **dotenv**: Manejo de variables de entorno

## 🔒 Seguridad

- **Credenciales**: Nunca commitees el archivo `.env`
- **Contraseñas de aplicación**: Usa contraseñas de aplicación de Gmail, no la contraseña principal
- **Kafka**: En producción, usa autenticación SASL/SSL

## 📈 Monitoreo

### Métricas Recomendadas

- Mensajes procesados por segundo
- Tasa de errores
- Latencia de procesamiento
- Mensajes en DLQ
- Estado de conexión Kafka

### Logs

El servicio implementa logging estructurado con Winston y trazabilidad mediante Correlation IDs:

#### Sistema de Logging

- **Logs estructurados en formato JSON** con rotación diaria
- **Correlation IDs** para trazabilidad end-to-end entre microservicios
- **Archivos de log:**
  - `logs/application-YYYY-MM-DD.log` - Logs generales (retención: 14 días)
  - `logs/error-YYYY-MM-DD.log` - Solo errores (retención: 30 días)

#### Eventos Logueados

- ✅ Conexión exitosa a Kafka
- ✅ Eventos consumidos de Kafka con correlation ID
- ✅ Procesamiento de emails (EMAIL_CONSUMED, EMAIL_SENT_SUCCESS)
- ✅ Operaciones de cola (CONSUMED, PROCESSED, FAILED)
- ⚠️ Advertencias de configuración
- ❌ Errores en el procesamiento con contexto completo
- 📧 Envío a Dead Letter Queue (DLQ)

#### Trazabilidad

Todos los eventos incluyen `correlation_id` que permite rastrear una operación desde `project_complaints` hasta este consumer:

```bash
# Buscar logs por correlation ID
grep "correlation-id-aqui" logs/application-*.log

# Ver solo eventos de email
grep "correlation-id-aqui" logs/application-*.log | grep EMAIL
```

#### Configuración

Agregar a `.env`:
```env
LOG_LEVEL=info  # debug, info, warn, error
```

Ver documentación completa: [LOGGING_VERIFICATION_GUIDE.md](../LOGGING_VERIFICATION_GUIDE.md)

## 🤝 Integración con Otros Servicios

Este servicio consume eventos publicados por:
- `project_complaints` - Publica eventos cuando se crean/actualizan quejas

## 📄 Licencia

ISC

## 👥 Autores

- **Nicolas Danilo Muñoz Aldana** - [@NicolasDaniloMunozAldana](https://github.com/NicolasDaniloMunozAldana)

---

**Versión**: 1.0.0
**Última actualización**: Diciembre 2024
