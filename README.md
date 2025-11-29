# Dance School Booking System

A TypeScript REST API for booking dance classes, built with AWS Lambda, Serverless Framework, Prisma, and PostgreSQL.

## Quick Start

### Prerequisites

- Node.js 22
- Docker

### Installation

```bash
npm install
```

### Environment Variables

The `.env` file is committed to the repository for local development convenience. For production deployments, use `dotenvx` with encryption keys for secure environment variable management.

### Database Setup

```bash
# Start PostgreSQL
docker-compose up -d

# Run migrations
npx prisma migrate dev

# Seed database
npm run seed
```

### Run Locally

```bash
serverless offline
```

The API will be available at `http://localhost:3000`.

## API Usage

### Search Classes

**GET** `/classes/search`

Query parameter:

- `type` (optional): `salsa`, `bachata`, `reggaeton`, or `any` (default: `any`)

**Examples:**

Navigate to these URLs in your browser:

- All classes: `http://localhost:3000/classes/search` or `http://localhost:3000/classes/search?type=any`
- Salsa classes: `http://localhost:3000/classes/search?type=salsa`
- Bachata classes: `http://localhost:3000/classes/search?type=bachata`
- Reggaeton classes: `http://localhost:3000/classes/search?type=reggaeton`

### Book a Class

**POST** `/classes/book`

**Headers:**

- `Content-Type: application/json`
- `idempotency-key: <unique-key>` (required)

**Request Body:**

```json
{
  "email": "student@example.com",
  "classInstanceId": "<uuid>"
}
```

**Example:**

```bash
curl -X POST "http://localhost:3000/classes/book" \
  -H "Content-Type: application/json" \
  -H "idempotency-key: $(uuidgen)" \
  -d '{
    "email": "alpha@example.com",
    "classInstanceId": "c2caf9f1-35f5-4582-a819-73ad8f5b5a81"
  }'
```

## Testing

```bash
# Unit tests
npm run test:unit

# E2E tests
npm run test:e2e

# All tests
npm run test:all
```

## Architecture

The system uses clean architecture with a repository pattern. Booking operations use database transactions to prevent overbooking and ensure consistency. Type-safe DTOs with Zod validation provide request/response validation.
