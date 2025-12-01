# 🚀 Quick Start - SQLite + Prisma

## Get Started in 2 Steps

### 1. Run Migration

```bash
npx prisma migrate deploy
```

This creates `omnistream.db` file with all tables.

### 2. Start Server

```bash
npm run dev
```

**That's it!** Your data now persists across server restarts.

---

## Verify It Works

### Test 1: Create a Community

```bash
curl -X POST http://localhost:3000/api/v1/community/create \
  -H "Content-Type: application/json" \
  -d '{"name": "My Test Community"}'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "community": {
      "id": "some-uuid-here",
      "name": "My Test Community",
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
}
```

### Test 2: Restart Server

```bash
# Stop server: Ctrl+C
# Start again:
npm run dev
```

### Test 3: Verify Data Persisted

```bash
curl http://localhost:3000/api/v1/community/list
```

Expected response:
```json
{
  "success": true,
  "data": {
    "communities": [
      {
        "id": "same-uuid-as-before",
        "name": "My Test Community",
        ...
      }
    ]
  }
}
```

✅ **Community still exists!** Data persisted.

---

## Test OAuth Persistence

### 1. Open Dashboard

```bash
cd examples/web-dashboard
npm start
```

Navigate to http://localhost:5173

### 2. Connect YouTube

1. Click "Create Community"
2. Enter a name
3. Click "Connect YouTube"
4. Complete OAuth flow
5. See "YouTube: Connected ✅"

### 3. Restart Backend

```bash
# In terminal running npm run dev
# Press Ctrl+C
npm run dev
```

### 4. Refresh Dashboard

Reload http://localhost:5173

✅ **YouTube should still show "Connected"** (this was broken before!)

---

## View Database

```bash
npx prisma studio
```

Opens GUI at http://localhost:5555 where you can browse all tables.

---

## Common Commands

### Backup Database
```bash
cp omnistream.db backup-$(date +%Y%m%d).db
```

### Restore Database
```bash
cp backup-20251129.db omnistream.db
```

### Reset Database (⚠️ Deletes Everything)
```bash
rm omnistream.db
npx prisma migrate deploy
```

### Check Database Size
```bash
ls -lh omnistream.db
```

---

## Configuration

### Current Setup

File: `.env`
```bash
DATABASE_URL="file:./omnistream.db"
```

### Switch to In-Memory (Testing Only)

Comment out DATABASE_URL in `.env`:
```bash
# DATABASE_URL="file:./omnistream.db"
```

Restart server → uses in-memory database (data lost on restart)

---

## What Changed?

### Before (In-Memory)
- ❌ Data lost on server restart
- ❌ OAuth tokens lost
- ❌ YouTube shows "Not Connected" after restart

### After (SQLite)
- ✅ Data persists to `omnistream.db` file
- ✅ OAuth tokens saved
- ✅ YouTube stays "Connected" after restart

---

## Database File Location

```
./omnistream.db
```

This file contains all your data:
- Communities
- OAuth tokens
- Streams
- Platform streams
- Chat messages

**Important:**
- ✅ Backup this file regularly
- ❌ Don't commit to public repos (contains secrets)
- ✅ Set permissions: `chmod 600 omnistream.db`

---

## Troubleshooting

### Migration fails: "database locked"

**Problem:** Another process is using SQLite.

**Solution:**
```bash
pkill -f "npm run dev"
npx prisma migrate deploy
```

### Data not persisting

**Problem:** In-memory database is being used.

**Solution:** Check `.env`:
```bash
DATABASE_URL="file:./omnistream.db"
```

Restart server.

### Build errors

**Solution:**
```bash
npx prisma generate
npm run build
```

---

## Production Deployment

### Set File Permissions
```bash
chmod 600 omnistream.db
```

### Set Up Automated Backups

Add to crontab:
```bash
0 2 * * * cp /path/to/omnistream.db /path/to/backups/omnistream-$(date +\%Y\%m\%d).db
```

Daily backup at 2 AM.

---

## When to Use SQLite

✅ **Perfect for:**
- Development and testing
- Single-server deployments
- Low to medium traffic (<100K requests/day)
- Embedded applications
- Quick prototypes

⚠️ **Consider PostgreSQL for:**
- High traffic (>100K requests/day)
- Multi-server deployments
- Horizontal scaling needs
- Complex analytics queries

---

## Help & Documentation

- **Full Guide:** [SQLITE_MIGRATION_COMPLETE.md](SQLITE_MIGRATION_COMPLETE.md)
- **Database Architecture:** [docs/guides/database-architecture.md](docs/guides/database-architecture.md)

---

## Summary

✅ **2 commands to get started:**
```bash
npx prisma migrate deploy
npm run dev
```

✅ **Data persists** across restarts
✅ **Zero dependencies** (no PostgreSQL server needed)
✅ **OAuth stays connected** 🎉

**Database file:** `./omnistream.db`

---

**You're all set!** 🚀
