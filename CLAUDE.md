# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
pnpm install

# Development (watch mode)
pnpm start:dev

# Build (runs prisma generate + nest build)
pnpm build

# Production
pnpm start:prod

# Lint (with auto-fix)
pnpm lint

# Format
pnpm format

# Unit tests
pnpm test

# Run a single test file
pnpm test -- --testPathPattern=auth.service

# E2E tests
pnpm test:e2e

# Prisma: generate types after schema changes
pnpm dlx prisma generate

# Prisma: apply migrations
pnpm dlx prisma migrate dev --name <migration-name>
```

## Architecture

NestJS modular monolith with PostgreSQL (via Prisma ORM + `@prisma/adapter-pg`). App runs on port 3001.

### Module Structure

Each feature lives in `src/<feature>/` with a consistent layout: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/`. Feature modules:

- **auth** — JWT authentication via HttpOnly cookies (`access_token` + `role`). Passport JWT strategy reads from the `access_token` cookie.
- **user** — CRUD with bcrypt password hashing; registration lives here.
- **booking** — Core booking lifecycle: PENDING → CONFIRMED → CHECKED_IN → COMPLETED | CANCELLED. Atomically creates booking + payment record in a Prisma transaction.
- **room** — Room availability checking uses overlapping date range query (`checkIn < outDate && checkOut > inDate`). Supports Cloudinary image uploads.
- **payment** — Slip upload, admin review/approval, and refund logic (100% refund ≥48h before check-in, 50% ≥0h, 0% after).
- **cloudinary** — Provider/service wrapping the Cloudinary SDK. Imported by RoomModule.
- **prisma** — `PrismaService` extends `PrismaClient` with the pg adapter. Exported globally.
- **jobs** — `@Cron(EVERY_10_MINUTES)` job that auto-cancels PENDING bookings past their payment deadline.
- **common** — Shared decorators: `@Auth(...roles)` (combines JWT guard + RolesGuard), `@GetUser()` (extracts user from request), `@Roles()` (metadata setter).

### Auth & Authorization

- JWT payload contains `sub` (userId) and `role`.
- `@Auth()` with no arguments requires any authenticated user; pass `Role.ADMIN` or `Role.USER` to restrict by role.
- The `@GetUser()` decorator returns the full Prisma user object (fetched in JwtStrategy.validate, excluding password).

### Database

Schema is at [prisma/schema.prisma](prisma/schema.prisma). Key relationships:
- `User` → `Booking[]` (one-to-many)
- `Room` → `Booking[]` (one-to-many)  
- `Booking` → `Payment` (one-to-one, payment cascades on booking delete)

Enums: `Role` (USER | ADMIN), `RoomStatus` (AVAILABLE | MAINTENANCE), `BookingStatus`, `PaymentStatus`.

Generated Prisma client types live in `src/generated/` (auto-generated, do not edit).

### Path Aliases

`@/*` maps to `src/*` (configured in [tsconfig.json](tsconfig.json) and supported at runtime via `tsconfig-paths`).

### Validation

DTOs use `class-validator` decorators. `ValidationPipe` is applied globally in `main.ts` — `whitelist` and `transform` options are currently commented out; enable them when stricter input handling is needed.

### Environment Variables

Required variables (see `.env` for current dev values):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | JWT signing secret |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `FRONTEND_URL` | CORS whitelist origin |
| `PORT` | Server port (default 3001) |
