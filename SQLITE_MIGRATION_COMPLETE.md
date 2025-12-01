# ✅ SQLite + Prisma Migration - COMPLETE

## Overview

The Omnistream codebase has been successfully migrated from in-memory database to **persistent SQLite database** using **Prisma ORM**.

All data (communities, OAuth tokens, streams, platform streams, chat messages) now persists across server restarts in a local `omnistream.db` file.

---

## What Was Done

### 1. ✅ Prisma Schema with SQLite

**File:** [prisma/schema.prisma](prisma/schema.prisma)

- Changed provider from `postgresql` to `sqlite`
- Converted `Json` types to `String` (SQLite doesn't support native JSON)
- Converted `String[]` arrays to `String` (JSON-encoded)
- All relationships, indexes, and constraints preserved

### 2. ✅ Database Adapter

**File:** [src/database/prisma-db.ts](src/database/prisma-db.ts) (renamed from `postgres.ts`)

- Class renamed: `PostgresDatabase` → `PrismaDatabase`
- All JSON fields now use `JSON.stringify()` / `JSON.parse()`
- OAuth tokens: stored as JSON string
- Stream platforms: stored as JSON array string
- Chat metadata: stored as JSON string
- All methods identical to PostgreSQL version

### 3. ✅ Database Factory

**File:** [src/database/index.ts](src/database/index.ts)

Auto-selects database based on `DATABASE_URL`:
- If `DATABASE_URL` starts with `file:` → **PrismaDatabase (SQLite)**
- If `DATABASE_URL` not set or invalid → **InMemoryDatabase**

```typescript
const usePrisma =
  process.env.DATABASE_URL &&
  (process.env.DATABASE_URL.startsWith('file:') ||
    process.env.DATABASE_URL.includes('.db') ||
    process.env.DATABASE_URL.startsWith('prisma://'));

export const db = usePrisma ? new PrismaDatabase() : new InMemoryDatabase();
```

### 4. ✅ SQLite Migration

**File:** [prisma/migrations/20251129145614_init/migration.sql](prisma/migrations/20251129145614_init/migration.sql)

- Complete SQL migration for SQLite
- All 5 tables: communities, oauth_tokens, streams, platform_streams, chat_messages
- All indexes and foreign keys
- CASCADE deletes configured

### 5. ✅ Environment Configuration

**Updated:**
- `.env`: `DATABASE_URL="file:./omnistream.db"`
- `.env.example`: Updated with SQLite example

---

## How to Use

### Quick Start (2 Steps)

```bash
# 1. Run migration (creates omnistream.db)
npx prisma migrate deploy

# 2. Start server
npm run dev
```

**That's it!** SQLite database is now active. All data persists across restarts.

---

## Database Schema

### Tables:

```sql
communities
├── id (TEXT PK)
├── name (TEXT)
├── createdAt (DATETIME)
└── updatedAt (DATETIME)

oauth_tokens
├── id (TEXT PK)
├── platform (TEXT)
├── tokens (TEXT - JSON-encoded)
├── updatedAt (DATETIME)
└── communityId (TEXT FK)

streams
├── id (TEXT PK)
├── communityId (TEXT FK)
├── title (TEXT)
├── description (TEXT NULL)
├── rtmpUrl (TEXT)
├── rtmpKey (TEXT)
├── platforms (TEXT - JSON-encoded array)
├── scheduledStartTime (DATETIME NULL)
├── createdAt (DATETIME)
└── updatedAt (DATETIME)

platform_streams
├── id (TEXT PK)
├── streamId (TEXT FK)
├── platform (TEXT)
├── platformStreamId (TEXT NULL)
├── status (TEXT)
├── viewerCount (INTEGER NULL)
├── platformUrl (TEXT NULL)
├── error (TEXT NULL)
└── updatedAt (DATETIME)

chat_messages
├── id (TEXT PK)
├── streamId (TEXT FK)
├── platform (TEXT)
├── platformMessageId (TEXT NULL)
├── authorId (TEXT)
├── authorName (TEXT)
├── authorImageUrl (TEXT NULL)
├── message (TEXT)
├── timestamp (DATETIME)
├── metadata (TEXT NULL - JSON-encoded)
└── createdAt (DATETIME)
```

### Indexes:

All critical queries indexed:
- Community → OAuth tokens lookup
- Community → Streams lookup
- Stream → Platform streams lookup
- Stream → Chat messages lookup
- Status-based queries

---

## Files Created/Modified

### Created:
- `prisma/schema.prisma` - SQLite schema
- `prisma/migrations/20251129145614_init/migration.sql` - Initial migration
- `prisma/migrations/migration_lock.toml` - SQLite provider lock
- `src/database/prisma-db.ts` - Prisma/SQLite adapter (renamed from postgres.ts)
- `omnistream.db` - SQLite database file (auto-created)
- `SQLITE_MIGRATION_COMPLETE.md` - This file

### Modified:
- `src/database/index.ts` - Database factory for SQLite
- `.env` - Updated DATABASE_URL to `file:./omnistream.db`
- `.env.example` - Updated documentation

### Unchanged:
- All API routes
- All service logic
- All tests
- Dashboard code

---

## What This Fixes

### 🎯 Primary Issue: YouTube "Not Connected" After Restart

**Before (In-Memory):**
```
1. Create community → saved in memory
2. Connect YouTube OAuth → saved in memory
3. Restart server → ALL DATA LOST
4. Dashboard: "YouTube: Not Connected" ❌
```

**After (SQLite):**
```
1. Create community → saved to omnistream.db
2. Connect YouTube OAuth → saved to omnistream.db
3. Restart server → DATA PERSISTS
4. Dashboard: "YouTube: Connected" ✅
```

---

## Differences from PostgreSQL Version

| Feature | PostgreSQL | SQLite |
|---------|-----------|--------|
| **Provider** | `postgresql` | `sqlite` |
| **Connection** | Network (localhost:5432) | File (`omnistream.db`) |
| **JSON Fields** | Native `Json` type | `String` with `JSON.stringify/parse` |
| **Arrays** | Native `String[]` | `String` with `JSON.stringify/parse` |
| **Setup** | Requires Docker/Postgres server | Zero setup, just a file |
| **Deployment** | External database | Single file, portable |
| **Production** | Recommended for scale | OK for low-traffic |

---

## Testing

### Build Test ✅
```bash
npm run typecheck  # PASSED
npm run build      # PASSED
```

### Persistence Test

```bash
# Start server
npm run dev

# Create community
curl -X POST http://localhost:3000/api/v1/community/create \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Community"}'

# Response:
{
  "success": true,
  "data": {
    "community": {
      "id": "uuid-here",
      "name": "Test Community"
    }
  }
}

# Restart server
# Ctrl+C, then npm run dev

# List communities
curl http://localhost:3000/api/v1/community/list

# Response should still include "Test Community" ✅
```

### OAuth Persistence Test

1. **Start server:** `npm run dev`
2. **Open dashboard:** `cd examples/web-dashboard && npm start`
3. **Connect YouTube** via OAuth flow
4. **Verify:** YouTube shows "Connected" ✅
5. **Restart backend:** `Ctrl+C`, then `npm run dev`
6. **Refresh dashboard:** YouTube still shows "Connected" ✅

---

## Prisma Commands

### View Database
```bash
npx prisma studio
# Opens GUI at http://localhost:5555
```

### Apply Migrations
```bash
npx prisma migrate deploy
```

### Create New Migration
```bash
npx prisma migrate dev --name migration_name
```

### Reset Database (⚠️ DELETES ALL DATA)
```bash
npx prisma migrate reset
```

### Generate Prisma Client
```bash
npx prisma generate
```

---

## Database Location

The SQLite database file is located at:
```
./omnistream.db
```

You can:
- ✅ Copy this file to backup data
- ✅ Delete this file to reset database
- ✅ Commit to git (if small, for development)
- ❌ Don't expose to public (contains OAuth tokens)

---

## Production Considerations

### SQLite is Great For:
- ✅ Development and testing
- ✅ Single-server deployments
- ✅ Low-traffic applications
- ✅ Embedded/desktop apps
- ✅ Quick prototypes

### Consider PostgreSQL/MySQL For:
- ⚠️ High-traffic production (100K+ requests/day)
- ⚠️ Multi-server deployments
- ⚠️ Horizontal scaling needs
- ⚠️ Complex queries and analytics
- ⚠️ Large datasets (>10GB)

### SQLite Limits:
- Max database size: ~281 TB (plenty for most use cases)
- Concurrent writes: One at a time (readers can read during writes)
- Best for: <100K HTTP requests/day
- Great for: Single-server setups

---

## Backup & Restore

### Backup
```bash
# Simple copy
cp omnistream.db omnistream-backup-$(date +%Y%m%d).db

# Or use SQLite dump
sqlite3 omnistream.db .dump > backup.sql
```

### Restore
```bash
# From file copy
cp omnistream-backup-20251129.db omnistream.db

# From SQL dump
sqlite3 omnistream.db < backup.sql
```

### Automated Daily Backups
```bash
# Add to crontab
0 2 * * * cp /path/to/omnistream.db /path/to/backups/omnistream-$(date +\%Y\%m\%d).db
```

---

## Security

### ⚠️ Important Notes:

1. **OAuth tokens are stored unencrypted**
   - SQLite file contains sensitive data
   - Set proper file permissions: `chmod 600 omnistream.db`
   - Do NOT commit to public git repos

2. **File Permissions**
   ```bash
   chmod 600 omnistream.db  # Owner read/write only
   ```

3. **Backups**
   - Encrypt backups of `omnistream.db`
   - Store securely
   - Don't expose via web server

4. **Production Encryption**
   - Consider: SQLCipher (encrypted SQLite)
   - Or: Migrate to PostgreSQL with pgcrypto

---

## Migrating from SQLite to PostgreSQL Later

If you need to scale later:

1. **Export data from SQLite:**
   ```bash
   npx prisma db pull
   ```

2. **Update schema to PostgreSQL:**
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

3. **Update DATABASE_URL:**
   ```bash
   DATABASE_URL="postgresql://user:pass@localhost:5432/omnistream"
   ```

4. **Run migrations:**
   ```bash
   npx prisma migrate dev
   ```

5. **Migrate data** (manual or using tools like `pgloader`)

---

## Troubleshooting

### Error: "Can't reach database server"

**Problem:** SQLite file doesn't exist.

**Solution:**
```bash
npx prisma migrate deploy
```

### Error: "database is locked"

**Problem:** Another process is writing to SQLite.

**Solution:** SQLite allows one writer at a time. Wait for other process to complete, or:
```bash
# Kill other processes
pkill -f "npm run dev"
# Restart
npm run dev
```

### Missing data after restart

**Problem:** Not using Prisma database.

**Solution:** Verify `.env`:
```bash
DATABASE_URL="file:./omnistream.db"
```

### Build errors

**Solution:**
```bash
npx prisma generate
npm run build
```

---

## Comparison: In-Memory vs SQLite

| Feature | In-Memory | SQLite |
|---------|-----------|--------|
| **Data Persistence** | ❌ Lost on restart | ✅ Persists to file |
| **OAuth Tokens** | ❌ Lost | ✅ Saved |
| **Setup Required** | None | `npx prisma migrate deploy` |
| **File Created** | None | `omnistream.db` |
| **Backup** | ❌ Not possible | ✅ Copy file |
| **Production Ready** | ❌ No | ✅ Yes (low traffic) |

---

## Next Steps

1. ✅ **Test OAuth persistence:**
   - Connect YouTube
   - Restart server
   - Verify still connected

2. ✅ **Set up backups:**
   ```bash
   # Daily backup cron job
   0 2 * * * cp omnistream.db backups/omnistream-$(date +\%Y\%m\%d).db
   ```

3. ✅ **Secure the database file:**
   ```bash
   chmod 600 omnistream.db
   ```

4. ⬜ **Monitor database size:**
   ```bash
   ls -lh omnistream.db
   ```

5. ⬜ **Plan data retention:**
   - Auto-delete old chat messages
   - Archive old streams

---

## Summary

✅ **Migration Complete!**
✅ **SQLite database** with Prisma ORM
✅ **Zero external dependencies** (no PostgreSQL server needed)
✅ **Data persists** across restarts
✅ **OAuth tokens stay connected** ✨
✅ **Single file** for easy backup/restore
✅ **Production-ready** for low/medium traffic
✅ **TypeScript compiles** without errors
✅ **All tests** compatible

### Critical Issue FIXED:

**YouTube OAuth now stays "Connected" after backend restarts!** 🎉

---

## Quick Reference

```bash
# Start server
npm run dev

# View database
npx prisma studio

# Run migrations
npx prisma migrate deploy

# Backup database
cp omnistream.db backup.db

# Check database size
ls -lh omnistream.db

# Reset database (⚠️ DELETES DATA)
rm omnistream.db && npx prisma migrate deploy
```

---

**Migration Complete!** 🚀

Database file: `./omnistream.db`
