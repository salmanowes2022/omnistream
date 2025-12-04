# 🚀 PostgreSQL Migration - Getting Started

## ✅ Migration Status: COMPLETE

All code has been implemented and tested. Follow these steps to start using PostgreSQL.

---

## Prerequisites

- Node.js 18+ installed
- Docker installed (for easiest setup)
- OR PostgreSQL 16+ installed locally

---

## Option 1: Quick Start with Docker (Recommended)

### 1. Start PostgreSQL

```bash
docker compose up -d postgres
```

**Expected output:**
```
✔ Container omnistream-db  Started
```

**Verify it's running:**
```bash
docker compose ps postgres
```

### 2. Run Database Migrations

```bash
npx prisma migrate deploy
```

**Expected output:**
```
✔ Applied migration 20250129000000_init
```

### 3. Start the Server

```bash
npm run dev
```

**Expected output:**
```
🚀 Omnistream server running on port 3000
```

### 4. Test It Works!

Open the dashboard:
```bash
cd examples/web-dashboard
npm install  # if not already installed
npm start
```

Navigate to http://localhost:5173 and:
1. Create a community
2. Connect to YouTube
3. **Restart the backend server** (Ctrl+C, then `npm run dev`)
4. Refresh the dashboard
5. **YouTube should still show "Connected" ✅**

---

## Option 2: Local PostgreSQL Installation

### 1. Install PostgreSQL

**macOS:**
```bash
brew install postgresql@16
brew services start postgresql@16
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql-16
sudo systemctl start postgresql
```

**Windows:**
Download from https://www.postgresql.org/download/windows/

### 2. Create Database and User

```bash
psql postgres
```

In psql prompt:
```sql
CREATE DATABASE omnistream;
CREATE USER omnistream WITH PASSWORD 'changeme';
GRANT ALL PRIVILEGES ON DATABASE omnistream TO omnistream;
\q
```

### 3. Verify Connection

```bash
psql postgresql://omnistream:changeme@localhost:5432/omnistream
```

If successful, type `\q` to exit.

### 4. Run Migrations and Start

```bash
# Run migrations
npx prisma migrate deploy

# Start server
npm run dev
```

---

## Verify Migration Success

### Method 1: Using Prisma Studio

```bash
npx prisma studio
```

Opens http://localhost:5555 - you should see all database tables.

### Method 2: Using API

Create a community:
```bash
curl -X POST http://localhost:3000/api/v1/community/create \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Community"}'
```

List communities:
```bash
curl http://localhost:3000/api/v1/community/list
```

Restart the server (`Ctrl+C`, then `npm run dev`), then list again:
```bash
curl http://localhost:3000/api/v1/community/list
```

**Community should still exist!** ✅

---

## Configuration

### Current .env Configuration

The `.env` file has been updated to:
```bash
DATABASE_URL=postgresql://omnistream:changeme@localhost:5432/omnistream
```

### Switch to In-Memory Database (for testing)

Comment out DATABASE_URL in `.env`:
```bash
# DATABASE_URL=postgresql://omnistream:changeme@localhost:5432/omnistream
```

Restart the server. It will automatically use in-memory database.

---

## Troubleshooting

### Error: "Connection refused"

**Problem:** PostgreSQL is not running.

**Solution:**
```bash
# If using Docker:
docker compose up -d postgres

# If using local PostgreSQL (macOS):
brew services start postgresql@16

# If using local PostgreSQL (Linux):
sudo systemctl start postgresql
```

### Error: "Authentication failed"

**Problem:** Wrong username/password.

**Solution:** Check `DATABASE_URL` in `.env` matches PostgreSQL credentials.

### Error: "Database does not exist"

**Problem:** Database not created.

**Solution:**
```bash
psql postgres -c "CREATE DATABASE omnistream;"
```

### Error: "Prisma schema not found"

**Problem:** Missing Prisma files.

**Solution:**
```bash
npx prisma generate
npx prisma migrate deploy
```

---

## What Changed?

### New Files:
- `prisma/schema.prisma` - Database schema
- `prisma/migrations/` - Migration files
- `src/database/postgres.ts` - PostgreSQL adapter
- `src/database/in-memory.ts` - In-memory fallback

### Modified Files:
- `package.json` - Added Prisma dependencies
- `src/database/index.ts` - Database factory
- `.env` - Updated DATABASE_URL

### What Didn't Change:
- All API routes work exactly the same
- No breaking changes to existing code
- Dashboard works without modifications
- Tests work without modifications

---

## Production Deployment

For production, use managed PostgreSQL:

**AWS RDS:**
```bash
DATABASE_URL=postgresql://user:pass@xxxxx.rds.amazonaws.com:5432/omnistream?sslmode=require
```

**Google Cloud SQL:**
```bash
DATABASE_URL=postgresql://user:pass@/omnistream?host=/cloudsql/project:region:instance
```

**Supabase:**
```bash
DATABASE_URL=postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres
```

Then run migrations:
```bash
npx prisma migrate deploy
```

---

## Common Commands

```bash
# Start PostgreSQL (Docker)
docker compose up -d postgres

# Stop PostgreSQL (Docker)
docker compose down postgres

# View PostgreSQL logs
docker compose logs -f postgres

# Run migrations
npx prisma migrate deploy

# Open Prisma Studio (database GUI)
npx prisma studio

# Generate Prisma Client (after schema changes)
npx prisma generate

# Create new migration
npx prisma migrate dev --name migration_name

# Reset database (⚠️ DELETES ALL DATA)
npx prisma migrate reset
```

---

## Testing OAuth Persistence

This is the main issue the migration fixes!

### Steps:

1. **Start backend and database:**
   ```bash
   docker compose up -d postgres
   npx prisma migrate deploy
   npm run dev
   ```

2. **Start dashboard:**
   ```bash
   cd examples/web-dashboard
   npm start
   ```

3. **Connect YouTube:**
   - Open http://localhost:5173
   - Create a community
   - Click "Connect YouTube"
   - Complete OAuth flow
   - See "YouTube: Connected ✅"

4. **Restart backend:**
   ```bash
   # In terminal running npm run dev
   # Press Ctrl+C
   npm run dev
   ```

5. **Refresh dashboard:**
   - Reload http://localhost:5173
   - **YouTube should STILL show "Connected" ✅**

**If YouTube stays connected after restart, the migration is successful!** 🎉

---

## Help & Documentation

- **Full Setup Guide:** [docs/guides/postgresql-setup.md](docs/guides/postgresql-setup.md)
- **Test Plan:** [POSTGRES_MIGRATION_TEST_PLAN.md](POSTGRES_MIGRATION_TEST_PLAN.md)
- **Migration Summary:** [POSTGRES_MIGRATION_COMPLETE.md](POSTGRES_MIGRATION_COMPLETE.md)
- **Database Architecture:** [docs/guides/database-architecture.md](docs/guides/database-architecture.md)

---

## Summary

✅ PostgreSQL migration is **COMPLETE**
✅ Data **persists** across server restarts
✅ OAuth tokens **stay connected** after restart
✅ **Zero breaking changes** to existing code
✅ **Automatic fallback** to in-memory if PostgreSQL unavailable

### Next Step:

```bash
docker compose up -d postgres
npx prisma migrate deploy
npm run dev
```

**That's it!** Your data now persists. 🚀
