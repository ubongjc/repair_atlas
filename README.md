# Repair Atlas

> Camera → Repairability Plan

A platform that helps users repair items by identifying them via camera, finding compatible parts, locating nearby tools, and accessing verified repair guides.

## Overview

Repair Atlas makes repair accessible by combining:
- **AI-powered identification**: Snap a photo to identify your item
- **Repair guidance**: Safety-first, step-by-step instructions with warranty awareness
- **Parts compatibility**: Crosswalk of compatible parts with affiliate links
- **Tool lending**: Map of nearby tool libraries with borrowing options
- **Community knowledge**: Provenance-scored repair guides from trusted sources

## Repositories

This monorepo contains two sibling applications:

### 📱 iOS Application (`repair_atlas_ios/`)
Native SwiftUI app with:
- Passkey-first authentication (WebAuthn)
- Client-side encryption (AES-GCM via CryptoKit)
- Camera-based item identification
- Tool library map with CoreLocation
- StoreKit subscriptions

**Requirements**: iOS 16+, Xcode 15+

[View iOS README](./repair_atlas_ios/README.md)

### 🌐 Web Application (`repair_atlas_web/`)
Next.js 15 web platform with:
- Server-side rendering and API routes
- PostgreSQL with Prisma ORM and pgvector
- Clerk authentication (passkey-first)
- Cloudflare R2 storage
- Stripe payments
- Sentry monitoring

**Requirements**: Node.js 18+, PostgreSQL 16+

[View Web README](./repair_atlas_web/README.md)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Apps                          │
├──────────────────────────┬──────────────────────────────────┤
│   iOS (SwiftUI)          │   Web (Next.js + React)          │
│   • Native UI            │   • Responsive design            │
│   • Client encryption    │   • Server-side rendering        │
│   • Offline capable      │   • Progressive enhancement      │
└──────────────┬───────────┴──────────────────┬───────────────┘
               │                              │
               └──────────────┬───────────────┘
                              │
                    HTTPS (REST + WebSocket)
                              │
               ┌──────────────┴───────────────┐
               │      Next.js API Routes      │
               │   • OpenAPI documented       │
               │   • ABAC authorization       │
               │   • Rate limiting            │
               └──────────────┬───────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   ┌────▼────┐         ┌──────▼──────┐      ┌──────▼──────┐
   │ Postgres │         │ Cloudflare  │      │   Stripe    │
   │ +pgvector│         │     R2      │      │  Payments   │
   └──────────┘         └─────────────┘      └─────────────┘
```

## Data Model (High Level)

- **User**: Account with role-based permissions
- **Item**: Identified device/product with photos and metadata
- **Defect**: Reported problem with symptoms and severity
- **FixPath**: Repair guide with steps, parts, risk assessment
- **Part**: Compatible replacement parts with purchasing links
- **ToolLibrary**: Physical locations for tool lending
- **Tool**: Individual tools available for borrowing
- **Subscription**: Pro/Premium tier entitlements

## Key Features

### 🔒 Security & Privacy
- **Passkey-first auth**: WebAuthn/FIDO2 across web and iOS
- **Client-side encryption**: Sensitive photos encrypted before upload (iOS)
- **ABAC**: Attribute-Based Access Control on all API routes
- **Audit logs**: Full traceability of data access

### 🔧 Repair Intelligence
- **Provenance scoring**: Trust ratings for repair guides
- **Warranty awareness**: Clearly marked warranty-preserving paths
- **Safety warnings**: Risk levels and required skills per repair
- **Compatibility crosswalks**: Alternative part numbers

### 🌍 Community Features
- **Tool lending map**: Nearby libraries with availability
- **Borrowing coordination**: Loan periods and deposits
- **Municipal partnerships**: Public tool library integrations

### 💳 Monetization
- Parts/tool affiliate commissions
- Pro subscriptions (advanced features, offline access)
- Municipal sponsorships
- B2B repair training modules

## Getting Started

### Prerequisites

- Node.js 18+ (for web)
- PostgreSQL 16 with pgvector extension
- Cloudflare account (for R2 storage)
- Clerk account (for auth)
- Stripe account (for payments)
- Xcode 15+ (for iOS development)
- Apple Developer account (for passkey testing)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd repair_atlas
   ```

2. **Set up the web application**
   ```bash
   cd repair_atlas_web
   npm install
   cp .env.example .env
   # Edit .env with your credentials
   npm run db:push
   npm run dev
   ```

3. **Set up the iOS application**
   ```bash
   cd repair_atlas_ios
   # Open RepairAtlas.xcodeproj in Xcode
   # Update domain in AuthenticationViewModel.swift
   # Build and run on physical device
   ```

4. **Database setup**
   ```bash
   # Enable pgvector in PostgreSQL
   psql -d repair_atlas -c "CREATE EXTENSION IF NOT EXISTS vector;"
   ```

## Environment Variables

See individual README files for complete environment setup:
- [Web environment variables](./repair_atlas_web/.env.example)
- iOS configuration in Xcode project settings

## Development

### Web Development
```bash
cd repair_atlas_web
npm run dev          # Start dev server
npm run build        # Production build
npm run db:studio    # Prisma Studio (DB GUI)
npm run lint         # ESLint
```

### iOS Development
```bash
# Open in Xcode
open repair_atlas_ios/RepairAtlas.xcodeproj

# Build: Cmd+B
# Run: Cmd+R
# Test: Cmd+U
```

## Deployment

### Web (Vercel/Railway/Fly.io)
1. Connect repository to hosting platform
2. Set environment variables
3. Deploy automatically on push

### iOS (App Store)
1. Archive in Xcode (Product → Archive)
2. Upload to App Store Connect
3. Submit for review

## Contributing

This is a private project. For authorized contributors:
1. Create feature branch from `main`
2. Make changes with clear commit messages
3. Test thoroughly
4. Submit pull request for review

## License

Proprietary - All rights reserved

## Support

For issues or questions:
- Web backend: See [Web README](./repair_atlas_web/README.md)
- iOS app: See [iOS README](./repair_atlas_ios/README.md)
- General: Contact the maintainers

---

**Built with**: Next.js 15, React 18, TypeScript 5, SwiftUI, Prisma 5, PostgreSQL 16, Clerk, Stripe, Cloudflare R2, Sentry
