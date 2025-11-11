# Guía de Configuración y Verificación de Kafka para Email

Esta guía explica cómo configurar y verificar que Kafka funciona correctamente para el sistema de envío de emails entre los microservicios.

---

## 📋 Prerrequisitos

- Docker y Docker Compose instalados
- Node.js 14+ instalado
- Acceso a terminal/consola

---

## 🚀 Paso 1: Iniciar Kafka con Docker Compose

### 1.1 Navegar al directorio raíz del proyecto

```bash
cd C:\Users\MSI\Downloads\ComplaintsV2
```

### 1.2 Iniciar los servicios de Kafka

```bash
docker-compose up -d
```

Este comando iniciará:

- **Kafka Broker** (puertos 9092, 29092)
- **kafka-init-topics** - Servicio que crea automáticamente los topics necesarios

### 1.3 Verificar que los servicios están corriendo

```bash
docker-compose ps
```

Deberías ver algo como:

```
NAME                STATUS          PORTS
kafka               Up             0.0.0.0:9092->9092/tcp, 0.0.0.0:29092->29092/tcp
kafka-init-topics   Exit 0         (crea topics y termina)
```

### 1.4 Ver logs de Kafka (opcional)

```bash
# Ver logs de todos los servicios
docker-compose logs -f

# Ver solo logs de Kafka
docker-compose logs -f kafka

# Ver logs del servicio de inicialización de topics
docker-compose logs kafka-init-topics
```

---

## ✅ Paso 2: Verificar que Kafka está Funcionando

### 2.1 Verificar que Kafka está escuchando

```bash
# Verificar que el puerto 9092 está abierto
netstat -an | findstr 9092

# O en PowerShell
Test-NetConnection -ComputerName localhost -Port 9092
```

### 2.2 Listar topics de Kafka

```bash
docker-compose exec kafka kafka-topics --list --bootstrap-server kafka:29092
```

**Resultado esperado**: Deberías ver los topics:

- `email-notifications`
- `email-dlq`

**Nota**: Los topics se crean automáticamente al iniciar `docker-compose` gracias al servicio `kafka-init-topics`.

### 2.3 Verificar que los topics se crearon correctamente

Los topics se crean automáticamente al iniciar `docker-compose`. Para verificar:

```bash
# Ver logs del servicio de inicialización
docker-compose logs kafka-init-topics
```

Deberías ver:

```
[INFO] Initializing Kafka topics...
[SUCCESS] Topics created successfully
[INFO] Available topics:
email-notifications
email-dlq
```

**Nota**: Si necesitas recrear los topics manualmente, puedes usar los mismos comandos que usa el servicio de inicialización.

### 2.4 Verificar detalles de un topic

```bash
docker-compose exec kafka kafka-topics --describe \
  --bootstrap-server kafka:29092 \
  --topic email-notifications
```

---

## 🔍 Paso 3: Verificar Kafka con Herramientas de Línea de Comandos

### 3.1 Ver detalles de los topics

```bash
# Ver detalles del topic email-notifications
docker-compose exec kafka kafka-topics --describe \
  --bootstrap-server kafka:29092 \
  --topic email-notifications

# Ver detalles del topic email-dlq
docker-compose exec kafka kafka-topics --describe \
  --bootstrap-server kafka:29092 \
  --topic email-dlq
```

**Resultado esperado**: Verás información sobre particiones, replicación y configuración de cada topic.

### 3.2 Consumir mensajes en tiempo real

```bash
# Ver mensajes del topic email-notifications en tiempo real
docker-compose exec kafka kafka-console-consumer \
  --bootstrap-server kafka:29092 \
  --topic email-notifications \
  --from-beginning \
  --property print.key=true \
  --property print.value=true \
  --property print.timestamp=true
```

**Nota**: Este comando se quedará escuchando y mostrará los mensajes conforme lleguen.

---

## 📧 Paso 4: Configurar los Microservicios

### 4.1 Configurar project_complaints (Producer)

1. Copiar el archivo de ejemplo:

```bash
cd ComplaintsV2\project_complaints
copy example.env .env
```

2. Editar `.env` y configurar:

```env
KAFKA_ENABLED=true
KAFKA_BROKERS=localhost:9092

# Email recipients (opcional, para testing)
EMAIL_RECIPIENTS=test@example.com
EMAIL_CC_RECIPIENTS=cc@example.com
```

3. Instalar dependencias (si no lo has hecho):

```bash
npm install
```

### 4.2 Configurar project_email_sender (Consumer)

1. Copiar el archivo de ejemplo:

```bash
cd EventsComplaints\project_email_sender
copy example.env .env
```

2. Editar `.env` y configurar:

```env
KAFKA_ENABLED=true
KAFKA_BROKERS=localhost:9092

# Configuración de Gmail
EMAIL_USER=tu-email@gmail.com
EMAIL_PASSWORD=tu-contraseña-de-aplicacion

PORT=3032
```

**Nota**: Para Gmail, necesitas crear una "Contraseña de aplicación":

1. Ve a tu cuenta de Google
2. Seguridad → Verificación en 2 pasos
3. Contraseñas de aplicaciones
4. Genera una nueva contraseña para "Correo"

---

## 🧪 Paso 5: Probar el Flujo Completo

### 5.1 Iniciar el Consumer (Email Sender)

En una terminal:

```bash
cd EventsComplaints\project_email_sender
npm start
```

**Resultado esperado**:

```
[OK] Email transporter initialized (Gmail)
[OK] Kafka Consumer connected successfully
[OK] Subscribed to topic: email-notifications
[OK] Email consumer started and listening for messages
[OK] Email Sender Service running on port 3032
```

### 5.2 Iniciar el Producer (Complaints Service)

En otra terminal:

```bash
cd ComplaintsV2\project_complaints
npm start
```

**Resultado esperado**:

```
[OK] Email Publisher Service initialized
[OK] Server started on port 3030
[INFO] Kafka Email Publisher: ENABLED
```

### 5.3 Crear una Queja (Genera Email)

Puedes crear una queja de dos formas:

#### Opción A: Usando la Interfaz Web

1. Abre tu navegador en `http://localhost:3030`
2. Completa el formulario de queja
3. Envía la queja

#### Opción B: Usando cURL (API)

```bash
curl -X POST http://localhost:3030/complaints/file \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "entity=1&description=Esta es una queja de prueba para verificar Kafka"
```

### 5.4 Verificar que el Email se Envió

En la terminal del **Email Sender Service**, deberías ver:

```
[OK] Processing email notification: email-complaint-123-1234567890
[OK] Email sent successfully: email-complaint-123-1234567890 (250ms)
```

---

## 🔎 Paso 6: Verificar Mensajes en Kafka

### 6.1 Consumir mensajes directamente desde Kafka

```bash
# Ver mensajes del topic email-notifications
docker-compose exec kafka kafka-console-consumer \
  --bootstrap-server kafka:29092 \
  --topic email-notifications \
  --from-beginning \
  --property print.key=true \
  --property print.value=true
```

**Resultado esperado**: Verás los mensajes JSON con los datos del email.

### 6.2 Ver mensajes usando console consumer

```bash
# Ver mensajes en tiempo real (se queda escuchando)
docker-compose exec kafka kafka-console-consumer \
  --bootstrap-server kafka:29092 \
  --topic email-notifications \
  --from-beginning \
  --property print.key=true \
  --property print.value=true
```

### 6.3 Verificar Consumer Groups

```bash
# Listar consumer groups
docker-compose exec kafka kafka-consumer-groups \
  --bootstrap-server kafka:29092 \
  --list

# Ver detalles del consumer group
docker-compose exec kafka kafka-consumer-groups \
  --bootstrap-server kafka:29092 \
  --group email-sender-service-group \
  --describe
```

**Resultado esperado**: Deberías ver el consumer group `email-sender-service-group` con información sobre los offsets.

---

## 🧪 Paso 7: Pruebas Adicionales

### 7.1 Probar Health Check del Email Sender

```bash
curl http://localhost:3032/health
```

**Resultado esperado**:

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

### 7.2 Probar Ready Check

```bash
curl http://localhost:3032/ready
```

**Resultado esperado**:

```json
{
  "ready": true
}
```

### 7.3 Enviar Email de Prueba Directo

```bash
curl -X POST http://localhost:3032/test-email \
  -H "Content-Type: application/json" \
  -d "{\"to\": \"test@example.com\"}"
```

---

## 🐛 Solución de Problemas

### Problema: Kafka no inicia

**Solución**:

```bash
# Ver logs detallados
docker-compose logs kafka

# Reiniciar servicios
docker-compose down
docker-compose up -d

# Verificar que los puertos no están en uso
netstat -an | findstr "9092\|2181"
```

### Problema: Consumer no recibe mensajes

**Verificaciones**:

1. Verificar que Kafka está corriendo: `docker-compose ps`
2. Verificar que el consumer está conectado: Revisar logs del Email Sender Service
3. Verificar que el topic existe: `docker-compose exec kafka kafka-topics --list --bootstrap-server kafka:29092`
4. Verificar variables de entorno: `KAFKA_ENABLED=true` y `KAFKA_BROKERS=localhost:9092`

### Problema: Producer no puede publicar

**Verificaciones**:

1. Verificar conexión a Kafka: Revisar logs del Complaints Service
2. Verificar que el topic existe o se puede crear automáticamente
3. Verificar variables de entorno

### Problema: Email no se envía

**Verificaciones**:

1. Verificar credenciales de Gmail en `.env`
2. Verificar logs del Email Sender Service
3. Verificar que el mensaje llegó a Kafka (usar console consumer)
4. Verificar DLQ si hay errores: `docker-compose exec kafka kafka-console-consumer --bootstrap-server kafka:29092 --topic email-dlq --from-beginning`

---

## 📊 Monitoreo Continuo

### Ver mensajes en tiempo real

```bash
# Terminal 1: Ver mensajes publicados
docker-compose exec kafka kafka-console-consumer \
  --bootstrap-server kafka:29092 \
  --topic email-notifications \
  --from-beginning

# Terminal 2: Ver mensajes en DLQ (si hay errores)
docker-compose exec kafka kafka-console-consumer \
  --bootstrap-server kafka:29092 \
  --topic email-dlq \
  --from-beginning
```

### Ver estadísticas del Consumer Group

```bash
docker-compose exec kafka kafka-consumer-groups \
  --bootstrap-server kafka:29092 \
  --group email-sender-service-group \
  --describe
```

---

## 🛑 Detener los Servicios

### Detener todos los servicios

```bash
docker-compose down
```

### Detener y eliminar volúmenes (limpiar todo)

```bash
docker-compose down -v
```

**⚠️ Advertencia**: Esto eliminará todos los mensajes y datos de Kafka.

---

## 📝 Checklist de Verificación

Usa este checklist para verificar que todo está funcionando:

- [ ] Kafka está corriendo (`docker-compose ps`)
- [ ] Topics existen (`email-notifications`, `email-dlq`)
- [ ] Topics creados automáticamente (`email-notifications`, `email-dlq`)
- [ ] Email Sender Service iniciado y conectado a Kafka
- [ ] Complaints Service iniciado y conectado a Kafka
- [ ] Health check del Email Sender responde OK
- [ ] Consumer group visible en Kafka
- [ ] Mensajes aparecen en Kafka cuando se crea una queja (verificar con console consumer)
- [ ] Email se envía correctamente
- [ ] Logs muestran procesamiento exitoso

---

## 🔗 Recursos Adicionales

- **Complaints Service**: <http://localhost:3030>
- **Email Sender Health**: <http://localhost:3032/health>
- **Documentación Kafka**: <https://kafka.apache.org/documentation/>

---

## 📞 Comandos Útiles de Referencia

```bash
# Iniciar servicios
docker-compose up -d

# Detener servicios
docker-compose down

# Ver logs
docker-compose logs -f kafka

# Listar topics
docker-compose exec kafka kafka-topics --list --bootstrap-server kafka:29092

# Ver mensajes de un topic
docker-compose exec kafka kafka-console-consumer \
  --bootstrap-server kafka:29092 \
  --topic email-notifications \
  --from-beginning

# Ver consumer groups
docker-compose exec kafka kafka-consumer-groups \
  --bootstrap-server kafka:29092 \
  --list

# Reiniciar servicios
docker-compose restart
```

---

**Última actualización**: Diciembre 2024
