# Project Email Sender

This project is an email sending microservice that consumes notification events from Kafka and sends emails asynchronously. It is designed to integrate with a complaint management system as part of a decoupled microservices architecture.

**Current Version:** 1.0.0

## Main Features

- **Kafka Consumer**: Consumes email notification events from the `email-notifications` topic.
- **Asynchronous Email Sending**: Processes and sends emails using Nodemailer (Gmail).
- **Automatic HTML Generation**: Generates HTML templates if no content is provided.
- **Robust Error Handling**: Automatic retries and Dead Letter Queue (DLQ) for failed messages.
- **Data Validation**: Validates and sanitizes data before sending.
- **Health Checks**: HTTP endpoints for service monitoring.
- **Horizontal Scalability**: Supports consumer groups for distributed processing.
- **End-to-End Traceability**: Correlation IDs and centralized logging for tracking operations across microservices.
- **Log Viewer Dashboard**: Web-based interface for viewing and analyzing application logs.

## Architecture

The service is part of a microservices architecture where `project_complaints` publishes email notification events to Kafka, and `project_email_sender` consumes and processes them:

```
┌─────────────────────┐
│  project_complaints │
│   (Producer)        │
└──────────┬──────────┘
           │
           │ Publishes events
           │ to Kafka
           ▼
    ┌──────────────┐
    │    Kafka     │
    │  Topic:      │
    │email-notif...│
    └──────┬───────┘
           │
           │ Consumes events
           ▼
┌─────────────────────┐
│ project_email_sender│
│   (Consumer)        │
└─────────────────────┘
```

## Project Structure

```
project_email_sender/
├── package.json
├── README.md
├── .env.example
├── .gitignore
├── docker-compose.yml       # Kafka and Zookeeper setup
├── KAFKA_SETUP_GUIDE.md     # Kafka configuration guide
├── test/                    # Test files
└── src/
    ├── app.js               # Entry point
    ├── config/
    │   └── kafkaConfig.js   # Kafka configuration
    ├── controllers/         # HTTP controllers
    ├── middlewares/
    │   └── correlationId.js # Correlation ID tracking
    ├── services/
    │   ├── KafkaConsumerService.js    # Kafka consumer
    │   ├── EmailService.js            # Email sending
    │   ├── EmailGeneratorService.js   # HTML generation
    │   └── logViewerService.js        # Log reading service
    ├── templates/           # Email templates
    ├── utils/
    │   └── logger.js        # Winston logger
    └── views/               # EJS templates
        └── log_viewer.ejs   # Log viewer dashboard
```

## Naming Conventions

To ensure consistency and traceability across the project, the following naming conventions must be used for issues, branches, and pull requests. This structure is based on Gitflow and includes a unique project identifier (`KAN`) for improved tracking.

### Issue Naming

All issues must be named using the following format:

```
[KAN-XX] Issue Title
```

- `KAN` is the project identifier and must always be uppercase.
- `XX` is the issue number.
- The title should be concise and clearly describe the issue.
- Example:
  ```
  [KAN-182] Edit README to follow new naming conventions
  ```

### Branch Naming

Branches must follow the Gitflow branching model with the addition of the project identifier and issue number.

```
<type>/(KAN-XX)-branch-name
```

- `<type>`: The Gitflow prefix (e.g., `feature`, `bugfix`, `hotfix`, `release`).
- `(KAN-XX)`: The project identifier and issue number, in parentheses, immediately after the Gitflow prefix. `KAN` must be uppercase.
- `branch-name`: A concise, kebab-case description of the branch purpose.
- Example:
  ```
  feature/(KAN-182)-edit-readme
  bugfix/(KAN-183)-fix-kafka-connection
  ```

### Pull Request Naming

Pull requests should use the same structure as branches, with the Gitflow type as a prefix. If the pull request is for documentation, add a `Docs/` prefix before the Gitflow type.

```
<Type>/(KAN-XX) Branch Title
```
or, for documentation:
```
Docs/<Type>/(KAN-XX) Branch Title
```

- `<Type>`: The Gitflow type, capitalized (e.g., `Feature`, `Bugfix`, `Hotfix`, `Release`).
- `(KAN-XX)`: The project identifier and issue number, in parentheses, immediately after the type.
- `Branch Title`: Short, descriptive, and in title case or plain English.
- For documentation pull requests, start the title with `Docs/`.
- Examples:
  ```
  Feature/(KAN-182) Edit README
  Bugfix/(KAN-183) Fix Kafka connection
  Docs/Feature/(KAN-184) Update Kafka setup guide
  ```

**Summary Table:**

| Entity         | Format                                         | Example                                           |
|----------------|------------------------------------------------|---------------------------------------------------|
| Issue          | `[KAN-XX] Issue title`                         | `[KAN-182] Edit README to follow new naming conventions` |
| Branch         | `type/(KAN-XX)-branch-name`                    | `feature/(KAN-182)-edit-readme`                   |
| Pull Request   | `Type/(KAN-XX) Branch Title`                   | `Feature/(KAN-182) Edit README`                   |
| PR (Docs)      | `Docs/Type/(KAN-XX) Branch Title`              | `Docs/Feature/(KAN-184) Update Kafka setup guide` |

**Guidelines:**
- Always keep `KAN` in uppercase and the issue number zero-padded if needed.
- The `(KAN-XX)` identifier is mandatory in branches and pull requests for tracking.
- Use descriptive, concise titles for issues, branches, and pull requests.

## Installation

1. **Clone the repository:**
   ```powershell
   git clone https://github.com/KevP2051/project_email_sender.git
   cd project_email_sender
   ```

2. **Install dependencies:**
   ```powershell
   npm install
   ```

3. **Configure the `.env` file:**
   ```powershell
   cp example.env .env
   ```
   Edit the `.env` file with your Kafka and Gmail credentials:

   ```env
   # Kafka Configuration
   KAFKA_ENABLED=true
   KAFKA_BROKERS=localhost:9092

   # Email Configuration (Gmail)
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASSWORD=your_app_password

   # Server Configuration
   PORT=3032

   # Logging
   LOG_LEVEL=info
   ```

4. **Set up Kafka:**

   Start Kafka and Zookeeper using Docker Compose:

   ```powershell
   docker-compose up -d
   ```

   Verify Kafka is running:

   ```powershell
   docker-compose ps
   ```

   For detailed Kafka setup instructions, see `KAFKA_SETUP_GUIDE.md`.

5. **Configure Gmail:**
   - Enable 2-step verification on your Gmail account.
   - Generate an app password.
   - Set the `EMAIL_USER` and `EMAIL_PASSWORD` variables in `.env`.

## Pull Request Description Structure

The suggested structure for pull request descriptions and the content to include is as follows:

### Description
- Provide a clear explanation of the changes made in this pull request.
- Specify what was modified, added, or removed.
- Indicate where the change was applied (e.g., consumer service, email service, configuration, etc.).
- Keep it factual and specific (no justifications here, just what was changed).

### Goal
- Explain the purpose of the change.
- Why was this modification necessary?
- What problem does it solve or what improvement does it bring?
- Focus on the intent (e.g., improve reliability, fix a bug, add a feature).

### Impact
- Describe the consequences of the change.
- How does it affect the system, users, or other modules?
- Mention any improvements, limitations, or potential risks.

### Example:

**Title**

Feature/(KAN-180) Add Kafka consumer for email notifications

**Description**

Implemented KafkaConsumerService to consume email notification events from the `email-notifications` topic.
Integrated EmailService with Nodemailer for sending emails via Gmail.
Added EmailGeneratorService to automatically generate HTML templates.
Configured retry logic and Dead Letter Queue (DLQ) for failed messages.
Added health check endpoints for monitoring service status.
Documented Kafka setup and configuration in KAFKA_SETUP_GUIDE.md.

**Goal**

Decouple email sending logic from the complaints service to improve system scalability and reliability.
Enable asynchronous processing of email notifications without blocking the main application.
Provide robust error handling and monitoring capabilities for production environments.

**Impact**

Users: No immediate visible changes, as emails continue to be sent as before.
System: Improved scalability and fault tolerance through asynchronous processing.
Risks: Requires Kafka infrastructure to be available; fallback mechanisms should be considered for Kafka downtime.

## Usage

### Development Server

To start the server in development mode with auto-reload:

```powershell
npm run dev
```

To start the server in production mode:

```powershell
npm start
```

The service will start on the port specified in `.env` (default: 3032).

### Available Scripts

```powershell
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Start development server with nodemon
npm run dev

# Start production server
npm start
```

## API Endpoints

### Health Check

**GET** `/health`

Verifies the service status, Kafka connection, and email configuration.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-12-10T15:30:00.000Z",
  "service": "email-sender",
  "kafka": true,
  "email": {
    "service": "gmail",
    "user": "your_email@gmail.com",
    "connected": true
  }
}
```

### Ready Check

**GET** `/ready`

Verifies if the service is ready to process messages (Kafka connected).

**Response:**
```json
{
  "ready": true
}
```

### Test Email

**POST** `/test-email`

Sends a test email (useful for verifying configuration).

**Request Body:**
```json
{
  "to": "recipient@example.com"
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

### Log Viewer

**GET** `/logs`

Access the log viewer dashboard to browse, filter, and analyze application logs in real-time.

Features:
- View logs with syntax highlighting
- Filter by level (error, warn, info, debug)
- Search by message, service name, or operation
- Track requests by correlation ID
- View statistics by level and service
- Auto-refresh every 30 seconds

## Kafka Message Format

The service expects messages in the following format:

```json
{
  "id": "email-complaint-123-1234567890",
  "timestamp": "2024-12-10T15:30:00.000Z",
  "to": "recipient@example.com",
  "cc": ["cc1@example.com", "cc2@example.com"],
  "subject": "Complaint Notification #123",
  "html": "<html>...</html>",
  "title": "Complaint #123 - Entity",
  "fromName": "Complaint Management System",
  "priority": "high",
  "retries": 0,
  "metadata": {
    "eventType": "complaint.created",
    "source": "complaints-service"
  },
  "complaintId": 123,
  "description": "Complaint description",
  "status": "open",
  "entityName": "Public Entity",
  "createdAt": "2024-12-10T15:30:00.000Z",
  "action": "New complaint registered"
}
```

### Required Fields

- `id`: Unique email ID
- `to`: Primary recipient
- `subject`: Email subject

### Optional Fields

- `html`: HTML content (automatically generated if not provided)
- `cc`: CC recipients
- `title`: Email title
- `fromName`: Sender name
- `priority`: Priority (`normal` or `high`)
- Complaint-specific fields (`complaintId`, `description`, etc.)

## Processing Flow

1. **Consumption**: The service consumes messages from the `email-notifications` topic.
2. **Sanitization**: Data is sanitized and validated.
3. **HTML Generation**: If no HTML is provided, it is generated using templates.
4. **Sending**: The email is sent using Nodemailer.
5. **Error Handling**: If it fails, it retries up to 3 times.
6. **DLQ**: If it fails after retries, it is sent to the `email-dlq` topic.

## Logging and Traceability

This project implements comprehensive logging with end-to-end traceability using Correlation IDs and Winston.

### Key Features

- **Correlation IDs**: Unique identifiers for tracking requests across services.
- **Structured Logging**: JSON logs with context and timestamps.
- **Auto-rotation**: Daily log files with automatic cleanup.
- **Microservice Support**: HTTP clients propagate correlation IDs to external services.

### Log Files

- `logs/application-YYYY-MM-DD.log` - General logs (retention: 14 days)
- `logs/error-YYYY-MM-DD.log` - Error logs only (retention: 30 days)

### Logged Events

- Kafka connection status
- Email consumption events with correlation ID
- Email sending results (success/failure)
- Queue operations (consumed, processed, failed)
- Configuration warnings
- Processing errors with full context
- Dead Letter Queue (DLQ) operations

### Traceability

All events include `correlation_id` to trace operations from `project_complaints` to this consumer:

```bash
# Search logs by correlation ID
grep "correlation-id-here" logs/application-*.log

# View only email events
grep "correlation-id-here" logs/application-*.log | grep EMAIL
```

### Configuration

Add to `.env`:
```env
LOG_LEVEL=info  # debug, info, warn, error
```

## Testing

### Manual Testing with cURL

```bash
# Health check
curl http://localhost:3032/health

# Test email
curl -X POST http://localhost:3032/test-email -H "Content-Type: application/json" -d "{\"to\": \"test@example.com\"}"
```

### Verify Kafka Consumption

```bash
# View messages in the topic
docker-compose exec kafka kafka-console-consumer --bootstrap-server kafka:29092 --topic email-notifications --from-beginning
```

## Troubleshooting

### Kafka Connection Issues

1. Verify Kafka is running:
   ```powershell
   docker-compose ps
   ```

2. Verify the topic exists:
   ```bash
   docker-compose exec kafka kafka-topics --list --bootstrap-server kafka:29092
   ```

3. Verify environment variables:
   ```powershell
   echo $env:KAFKA_BROKERS
   echo $env:KAFKA_ENABLED
   ```

### Emails Not Sending

1. Verify Gmail credentials in `.env`
2. Check service logs
3. Verify messages are reaching Kafka
4. Review DLQ for failed messages

### Consumer Not Processing Messages

1. Verify consumer group is active
2. Check consumer offsets:
   ```bash
   docker-compose exec kafka kafka-consumer-groups --bootstrap-server kafka:29092 --group email-sender-service-group --describe
   ```

## Main Dependencies

### Production
- **kafkajs** - Kafka client for Node.js
- **nodemailer** - Email sending
- **express** - Web framework for HTTP endpoints
- **dotenv** - Environment variable management
- **winston** - Logging library
- **winston-daily-rotate-file** - Log rotation
- **uuid** - Correlation ID generation

### Development and Testing
- **jest** - Testing framework
- **nodemon** - Development auto-reload

## Security

- **Credentials**: Never commit the `.env` file
- **App Passwords**: Use Gmail app passwords, not your main password
- **Kafka**: In production, use SASL/SSL authentication

## Integration with Other Services

This service consumes events published by:
- `project_complaints` - Publishes events when complaints are created/updated

## Authors

- **Luis Enrique Hernandez Valbuena** - [@Luisen1](https://github.com/Luisen1)
- **Kevin Johann Jimenez Poveda** - [@KevP2051](https://github.com/KevP2051)
- **Nicolas Danilo Munoz Aldana** - [@NicolasDaniloMunozAldana](https://github.com/NicolasDaniloMunozAldana)

## License

ISC
