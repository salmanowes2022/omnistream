# PostgreSQL Setup Guide

## Overview

Omnistream now supports **persistent PostgreSQL database** using Prisma ORM. This replaces the in-memory database and ensures data persists across server restarts.

**Key Benefits:**
- ✅ **Data persistence** - Communities, OAuth tokens, and streams survive server restarts
- ✅ **YouTube OAuth stays connected** - No more "Not Connected" after restart
- ✅ **Production-ready** - Scalable, reliable, and backed by PostgreSQL
- ✅ **Automatic fallback** - Still uses in-memory DB if PostgreSQL not configured

---

## Quick Start

### Option 1: Using Docker (Recommended)

1. **Start PostgreSQL container:**
   ```bash
   docker compose up -d postgres
   ```

2. **Verify DATABASE_URL in .env:**
   ```bash
   DATABASE_URL=postgresql://omnistream:changeme@localhost:5432/omnistream
   ```

3. **Run migrations:**
   ```bash
   npx prisma migrate deploy
   ```

4. **Start the application:**
   ```bash
   npm run dev
   ```

### Option 2: Local PostgreSQL Installation

1. **Install PostgreSQL:**
   - macOS: `brew install postgresql@16 && brew services start postgresql@16`
   - Ubuntu/Debian: `sudo apt install postgresql-16`
   - Windows: Download from [postgresql.org](https://www.postgresql.org/download/)

2. **Create database and user:**
   ```bash
   psql postgres
   ```
   ```sql
   CREATE DATABASE omnistream;
   CREATE USER omnistream WITH PASSWORD 'changeme';
   GRANT ALL PRIVILEGES ON DATABASE omnistream TO omnistream;
   \q
   ```

3. **Update .env:**
   ```bash
   DATABASE_URL=postgresql://omnistream:changeme@localhost:5432/omnistream
   ```

4. **Run migrations:**
   ```bash
   npx prisma migrate deploy
   ```

5. **Start the application:**
   ```bash
   npm run dev
   ```

---

## Database Schema

The PostgreSQL database stores the following data:

### Communities
- `id` - UUID primary key
- `name` - Community/organization name
- `createdAt` - Creation timestamp
- `updatedAt` - Last update timestamp

### OAuth Tokens
- `id` - UUID primary key
- `communityId` - Foreign key to Community
- `platform` - Platform name (youtube, facebook, tiktok)
- `tokens` - JSON object containing:
  - `accessToken`
  - `refreshToken`
  - `expiresAt`
  - `scope`
- `updatedAt` - Last update timestamp

### Stream Configurations
- `id` - UUID primary key
- `communityId` - Foreign key to Community
- `title` - Stream title
- `description` - Stream description (optional)
- `rtmpUrl` - RTMP input URL
- `rtmpKey` - RTMP stream key
- `platforms` - Array of platforms (youtube, facebook, tiktok)
- `scheduledStartTime` - Scheduled start (optional)
- `createdAt` / `updatedAt` - Timestamps

### Platform Streams
- `id` - UUID primary key
- `streamId` - Foreign key to StreamConfig
- `platform` - Platform name
- `platformStreamId` - Platform-specific stream ID
- `status` - Stream status (idle, live, ended, error)
- `viewerCount` - Current viewer count (optional)
- `platformUrl` - Platform-specific URL (optional)
- `error` - Error message (optional)
- `updatedAt` - Last update timestamp

### Chat Messages
- `id` - UUID primary key
- `streamId` - Foreign key to StreamConfig
- `platform` - Platform name
- `platformMessageId` - Original message ID from platform
- `authorId` - Message author ID
- `authorName` - Author display name
- `authorImageUrl` - Author avatar URL (optional)
- `message` - Message content
- `timestamp` - Message timestamp
- `metadata` - JSON metadata (highlighted, etc.)
- `createdAt` - Creation timestamp

---

## Migration Commands

### Create a new migration
```bash
npx prisma migrate dev --name migration_name
```

### Apply migrations to production
```bash
npx prisma migrate deploy
```

### Reset database (⚠️ DELETES ALL DATA)
```bash
npx prisma migrate reset
```

### View current database status
```bash
npx prisma migrate status
```

### Generate Prisma Client (after schema changes)
```bash
npx prisma generate
```

---

## Environment Configuration

### PostgreSQL (Production/Development)
```bash
# .env
DATABASE_URL=postgresql://omnistream:changeme@localhost:5432/omnistream
```

### In-Memory Database (Testing Only)
```bash
# .env - Comment out DATABASE_URL or use invalid value
# DATABASE_URL=memory
```

**The application automatically detects which database to use:**
- If `DATABASE_URL` starts with `postgres://` or `postgresql://` → PostgreSQL
- Otherwise → In-memory database

---

## Docker Compose Configuration

The included `docker-compose.yml` provides a production-ready PostgreSQL setup:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: omnistream
      POSTGRES_PASSWORD: changeme  # Change in production!
      POSTGRES_DB: omnistream
    volumes:
      - postgres-data:/var/lib/postgresql/data
    ports:
      - '5432:5432'
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U omnistream']
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres-data:
    driver: local
```

**Start PostgreSQL only:**
```bash
docker compose up -d postgres
```

**View logs:**
```bash
docker compose logs -f postgres
```

**Stop PostgreSQL:**
```bash
docker compose down
```

**Stop and delete data (⚠️ DELETES ALL DATA):**
```bash
docker compose down -v
```

---

## Troubleshooting

### "YouTube Not Connected" after restart

**Problem:** OAuth tokens are lost when server restarts.

**Solution:** This is now fixed! With PostgreSQL, OAuth tokens persist across restarts.

**Verification:**
1. Start the server: `npm run dev`
2. Connect to YouTube via dashboard
3. Restart the server: `Ctrl+C`, then `npm run dev`
4. Refresh dashboard → YouTube should still show "Connected" ✅

### Connection refused

**Problem:** Cannot connect to PostgreSQL.

**Solutions:**
1. **Docker not running:**
   ```bash
   docker compose up -d postgres
   ```

2. **Wrong credentials:**
   - Check `DATABASE_URL` in `.env`
   - Verify PostgreSQL user/password

3. **PostgreSQL not started:**
   ```bash
   # macOS
   brew services start postgresql@16

   # Linux
   sudo systemctl start postgresql
   ```

### Migration failed

**Problem:** `prisma migrate deploy` fails.

**Solutions:**
1. **Database doesn't exist:**
   ```sql
   psql postgres
   CREATE DATABASE omnistream;
   ```

2. **Permission denied:**
   ```sql
   psql postgres
   GRANT ALL PRIVILEGES ON DATABASE omnistream TO omnistream;
   ```

3. **Schema out of sync:**
   ```bash
   npx prisma migrate reset  # ⚠️ Deletes all data
   npx prisma migrate deploy
   ```

### View database contents

**Using Prisma Studio:**
```bash
npx prisma studio
```
Opens browser UI at http://localhost:5555

**Using psql:**
```bash
psql postgresql://omnistream:changeme@localhost:5432/omnistream

# List all communities
SELECT * FROM communities;

# List OAuth tokens
SELECT community_id, platform, updated_at FROM oauth_tokens;

# List streams
SELECT id, title, platforms FROM streams;
```

---

## Production Deployment

### Security Checklist

- [ ] **Change default password:**
  ```bash
  POSTGRES_PASSWORD=your_secure_password_here
  DATABASE_URL=postgresql://omnistream:your_secure_password@localhost:5432/omnistream
  ```

- [ ] **Enable SSL:**
  ```bash
  DATABASE_URL=postgresql://omnistream:password@localhost:5432/omnistream?sslmode=require
  ```

- [ ] **Restrict network access:**
  - Don't expose PostgreSQL port (5432) to public internet
  - Use firewall rules or VPC

- [ ] **Set up backups:**
  ```bash
  # Automated daily backups
  pg_dump postgresql://omnistream:password@localhost:5432/omnistream > backup.sql
  ```

- [ ] **Monitor disk space:**
  - Chat messages can grow large over time
  - Set up retention policies

- [ ] **Use connection pooling:**
  - PgBouncer for production deployments
  - Prevents connection exhaustion

### Managed PostgreSQL Providers

For production, consider using managed PostgreSQL:

- **AWS RDS PostgreSQL**
- **Google Cloud SQL**
- **Azure Database for PostgreSQL**
- **Supabase** (PostgreSQL + API)
- **Neon** (Serverless PostgreSQL)
- **Railway** (Easy deployment)

Update `DATABASE_URL` with provider's connection string:
```bash
DATABASE_URL=postgresql://user:password@provider-host.com:5432/omnistream?sslmode=require
```

---

## Performance Optimization

### Indexes (Already Included)

All critical queries are indexed:
```sql
-- Community lookups
CREATE INDEX oauth_tokens_communityId_idx ON oauth_tokens(communityId);
CREATE INDEX streams_communityId_idx ON streams(communityId);

-- Stream status queries
CREATE INDEX platform_streams_status_idx ON platform_streams(status);

-- Chat message queries
CREATE INDEX chat_messages_streamId_idx ON chat_messages(streamId);
CREATE INDEX chat_messages_timestamp_idx ON chat_messages(timestamp);
CREATE INDEX chat_messages_streamId_timestamp_idx ON chat_messages(streamId, timestamp);
```

### Connection Pooling

For high-traffic deployments:
```bash
# Use PgBouncer or Prisma connection pooling
DATABASE_URL=postgresql://omnistream:password@localhost:6432/omnistream?pgbouncer=true&connection_limit=20
```

### Data Retention

Auto-delete old chat messages:
```sql
-- Delete chat messages older than 30 days
DELETE FROM chat_messages WHERE created_at < NOW() - INTERVAL '30 days';
```

Add to cron job:
```bash
0 2 * * * psql $DATABASE_URL -c "DELETE FROM chat_messages WHERE created_at < NOW() - INTERVAL '30 days';"
```

---

## Testing

### Run tests with PostgreSQL

```bash
# Set test database URL
export TEST_DATABASE_URL=postgresql://omnistream:changeme@localhost:5432/omnistream_test

# Run tests
npm test
```

### Switch between databases for testing

```typescript
// src/__tests__/setup.ts
import { PostgresDatabase } from '../database/postgres';
import { InMemoryDatabase } from '../database/in-memory';

export const testDb = process.env.TEST_DATABASE_URL
  ? new PostgresDatabase()
  : new InMemoryDatabase();
```

---

## Summary

✅ **PostgreSQL is now fully integrated**
✅ **Data persists across restarts**
✅ **OAuth tokens remain connected**
✅ **Automatic fallback to in-memory DB**
✅ **Production-ready with Prisma ORM**

**Next Steps:**
1. Start PostgreSQL: `docker compose up -d postgres`
2. Run migrations: `npx prisma migrate deploy`
3. Start server: `npm run dev`
4. Test OAuth: Connect YouTube → Restart → Still connected! 🎉
