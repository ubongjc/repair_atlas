# Repair Atlas Web

Camera-powered repairability plans with compatible parts, tools, and verified guides.

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: PostgreSQL 16 + Prisma 5 with pgvector
- **Auth**: Clerk (Passkey-first, WebAuthn)
- **Storage**: Cloudflare R2 (S3-compatible)
- **Payments**: Stripe
- **Monitoring**: Sentry + OpenTelemetry
- **Image Processing**: exiftool-vendored

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 16 with pgvector extension
- Cloudflare R2 bucket
- Clerk account
- Stripe account (for payments)

### Installation

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:

```bash
cp .env.example .env
```

Fill in the required values in `.env`:
- Database connection string
- Clerk keys (with passkey enabled)
- Stripe keys
- R2 credentials
- Sentry DSN

3. Set up the database:

```bash
# Enable pgvector extension in PostgreSQL
psql -d repair_atlas -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Run Prisma migrations
npm run db:push

# Or for production
npm run db:migrate
```

4. Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
src/
├── app/                  # Next.js App Router pages and layouts
│   ├── api/             # API routes
│   │   ├── health/      # Health check endpoint
│   │   ├── item/        # Item identification endpoints
│   │   └── webhooks/    # Webhook handlers (Clerk, Stripe)
│   ├── globals.css      # Global styles
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Home page
├── components/          # React components
│   └── ui/             # shadcn/ui components
├── lib/                # Utility libraries
│   ├── auth.ts         # Authentication helpers
│   ├── db.ts           # Prisma client
│   ├── storage.ts      # R2 storage helpers
│   └── utils.ts        # General utilities
└── types/              # TypeScript type definitions
    └── api.ts          # API request/response types
```

## API Documentation

### Core Endpoints

#### `POST /api/item/identify`
Upload a photo to identify an item and extract metadata.

**Authentication**: Required

**Request**:
- `Content-Type: multipart/form-data`
- `image`: File (required)
- `category`: string (optional)

**Response**:
```json
{
  "id": "string",
  "category": "string",
  "brand": "string | null",
  "model": "string | null",
  "confidence": 0.95,
  "photoUrls": ["https://..."],
  "metadata": {},
  "createdAt": "2025-01-01T00:00:00Z"
}
```

#### `GET /api/health`
Health check endpoint to verify API and database connectivity.

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-01-01T00:00:00Z",
  "database": "connected"
}
```

## Database Schema

Key models:
- **User**: User accounts (synced from Clerk)
- **Item**: Identified items with photos and metadata
- **Defect**: Reported issues with items
- **FixPath**: Repair guides with steps, parts, and risk assessments
- **Part**: Compatible parts for repairs
- **ToolLibrary**: Physical locations for tool lending
- **Tool**: Individual tools available for borrowing
- **Subscription**: Stripe subscription tracking

## Authentication

The app uses Clerk with passkey-first authentication:
- Primary: WebAuthn/Passkeys
- Fallback: Magic links
- Roles: USER, PRO, ADMIN
- ABAC (Attribute-Based Access Control) enforced on API routes

## Storage & Privacy

- Photos and sensitive data are stored in Cloudflare R2
- Client-side encryption for sensitive uploads (implemented in mobile app)
- Server only stores ciphertext for encrypted data
- Signed URLs for temporary access

## Development

### Database Commands

```bash
# Generate Prisma client
npm run db:generate

# Push schema changes (development)
npm run db:push

# Create and run migrations (production)
npm run db:migrate

# Open Prisma Studio
npm run db:studio
```

### Building for Production

```bash
npm run build
npm run start
```

## License

Proprietary
