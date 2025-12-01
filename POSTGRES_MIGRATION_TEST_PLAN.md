# PostgreSQL Migration - Test Plan

## ✅ Implementation Complete

This document outlines the testing steps to verify the PostgreSQL migration works correctly.

---

## Pre-Test Setup

### 1. Start PostgreSQL

**Option A: Using Docker (Recommended)**
```bash
docker compose up -d postgres
```

**Option B: Local PostgreSQL**
```bash
# macOS
brew services start postgresql@16

# Linux
sudo systemctl start postgresql
```

### 2. Verify Environment Configuration

Check `.env` file:
```bash
DATABASE_URL=postgresql://omnistream:changeme@localhost:5432/omnistream
```

### 3. Run Database Migrations

```bash
npx prisma migrate deploy
```

Expected output:
```
✔ Applied migration 20250129000000_init
```

### 4. Start the Server

```bash
npm run dev
```

Expected output:
```
🚀 Omnistream server running on port 3000
```

---

## Test 1: Community Persistence

**Objective:** Verify that communities persist across server restarts.

### Steps:

1. **Create a community:**
   ```bash
   curl -X POST http://localhost:3000/api/v1/community/create \
     -H "Content-Type: application/json" \
     -d '{"name": "Test Community"}'
   ```

   Expected response:
   ```json
   {
     "success": true,
     "data": {
       "community": {
         "id": "uuid-here",
         "name": "Test Community",
         "createdAt": "...",
         "updatedAt": "..."
       }
     }
   }
   ```

   **Save the `id` for later tests.**

2. **Stop the server:**
   ```bash
   # Press Ctrl+C in terminal running npm run dev
   ```

3. **Restart the server:**
   ```bash
   npm run dev
   ```

4. **Verify community still exists:**
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
           "id": "uuid-here",
           "name": "Test Community",
           "createdAt": "...",
           "updatedAt": "..."
         }
       ]
     }
   }
   ```

✅ **PASS:** Community persists after restart
❌ **FAIL:** Community disappears after restart

---

## Test 2: OAuth Token Persistence (YouTube Connected Status)

**Objective:** Verify OAuth tokens persist and YouTube shows "Connected" after restart.

### Steps:

1. **Open the web dashboard:**
   ```bash
   cd examples/web-dashboard
   npm install
   npm start
   ```

   Navigate to http://localhost:5173

2. **Create a community:**
   - Click "Create Community"
   - Enter a name
   - Click "Create"
   - **Save the Community ID from localStorage**

3. **Connect to YouTube:**
   - Click "Connect YouTube"
   - Complete OAuth flow
   - Verify "YouTube: Connected ✅" appears

4. **Stop the backend server:**
   ```bash
   # In terminal running npm run dev
   # Press Ctrl+C
   ```

5. **Restart the backend server:**
   ```bash
   npm run dev
   ```

6. **Refresh the dashboard:**
   - Reload http://localhost:5173
   - Community ID should still be in localStorage
   - Check YouTube connection status

✅ **PASS:** YouTube shows "Connected ✅" after restart
❌ **FAIL:** YouTube shows "Not Connected" after restart

---

## Test 3: Stream Configuration Persistence

**Objective:** Verify stream configurations persist across restarts.

### Steps:

1. **Create a stream:**
   ```bash
   curl -X POST http://localhost:3000/api/v1/streams/create \
     -H "Content-Type: application/json" \
     -d '{
       "communityId": "your-community-id",
       "title": "Test Stream",
       "description": "Testing persistence",
       "platforms": ["youtube"]
     }'
   ```

   Expected response:
   ```json
   {
     "success": true,
     "data": {
       "stream": {
         "id": "stream-uuid",
         "communityId": "...",
         "title": "Test Stream",
         "rtmpUrl": "rtmp://...",
         "rtmpKey": "...",
         "platforms": ["youtube"]
       }
     }
   }
   ```

2. **Stop and restart server:**
   ```bash
   # Ctrl+C
   npm run dev
   ```

3. **List streams:**
   ```bash
   curl http://localhost:3000/api/v1/streams/list/your-community-id
   ```

   Expected: Stream still exists with same ID and configuration

✅ **PASS:** Stream persists after restart
❌ **FAIL:** Stream disappears after restart

---

## Test 4: Database Switching (In-Memory Fallback)

**Objective:** Verify the app falls back to in-memory DB when PostgreSQL is unavailable.

### Steps:

1. **Stop PostgreSQL:**
   ```bash
   docker compose down postgres
   # OR
   brew services stop postgresql@16
   ```

2. **Comment out DATABASE_URL in .env:**
   ```bash
   # DATABASE_URL=postgresql://omnistream:changeme@localhost:5432/omnistream
   ```

3. **Restart the server:**
   ```bash
   npm run dev
   ```

4. **Create a community:**
   ```bash
   curl -X POST http://localhost:3000/api/v1/community/create \
     -H "Content-Type: application/json" \
     -d '{"name": "In-Memory Community"}'
   ```

   Expected: Successfully creates community (using in-memory DB)

5. **Restart server:**
   ```bash
   # Ctrl+C
   npm run dev
   ```

6. **List communities:**
   ```bash
   curl http://localhost:3000/api/v1/community/list
   ```

   Expected: Community list is empty (in-memory data lost)

✅ **PASS:** Falls back to in-memory DB, data doesn't persist
❌ **FAIL:** Server crashes or fails to start

---

## Test 5: Prisma Studio Inspection

**Objective:** Verify data is correctly stored in PostgreSQL using Prisma Studio.

### Steps:

1. **Open Prisma Studio:**
   ```bash
   npx prisma studio
   ```

   Opens browser at http://localhost:5555

2. **Inspect data:**
   - Click "Community" model → Should see test communities
   - Click "OAuthToken" model → Should see saved OAuth tokens
   - Click "StreamConfig" model → Should see test streams

3. **Verify relationships:**
   - Click on a Community → Should show related tokens and streams
   - Click on a StreamConfig → Should show related PlatformStreams

✅ **PASS:** All data visible and relationships correct
❌ **FAIL:** Missing data or broken relationships

---

## Test 6: TypeScript Compilation

**Objective:** Verify the project compiles without errors.

### Steps:

1. **Run type checking:**
   ```bash
   npm run typecheck
   ```

   Expected output: No errors

2. **Build the project:**
   ```bash
   npm run build
   ```

   Expected: Build succeeds, creates `dist/` folder

✅ **PASS:** No TypeScript errors, build succeeds
❌ **FAIL:** Type errors or build failures

---

## Test 7: Chat Message Persistence

**Objective:** Verify chat messages persist across restarts.

### Steps:

1. **Create a stream** (if not already created)

2. **Add a chat message:**
   ```bash
   curl -X POST http://localhost:3000/api/v1/chat/send \
     -H "Content-Type: application/json" \
     -d '{
       "streamId": "your-stream-id",
       "platform": "youtube",
       "authorId": "test-user",
       "authorName": "Test User",
       "message": "Hello from PostgreSQL!",
       "timestamp": "2025-01-29T10:00:00.000Z"
     }'
   ```

3. **Restart server:**
   ```bash
   # Ctrl+C
   npm run dev
   ```

4. **Retrieve chat messages:**
   ```bash
   curl http://localhost:3000/api/v1/chat/your-stream-id
   ```

   Expected: Chat message still exists

✅ **PASS:** Chat message persists
❌ **FAIL:** Chat message disappears

---

## Test 8: Production Docker Deployment

**Objective:** Verify the entire stack runs in Docker.

### Steps:

1. **Build and start all services:**
   ```bash
   docker compose up -d
   ```

2. **Wait for services to be healthy:**
   ```bash
   docker compose ps
   ```

   Expected:
   ```
   NAME                STATUS
   omnistream-api      healthy
   omnistream-db       healthy
   ```

3. **Test API:**
   ```bash
   curl http://localhost:3000/health
   ```

   Expected: `{"status":"ok"}`

4. **Test persistence:**
   - Create community via API
   - Restart containers: `docker compose restart omnistream`
   - Verify community still exists

✅ **PASS:** All services healthy, data persists
❌ **FAIL:** Services fail to start or data is lost

---

## Test Summary Checklist

- [ ] Test 1: Community Persistence ✅
- [ ] Test 2: OAuth Token Persistence (YouTube Connected) ✅
- [ ] Test 3: Stream Configuration Persistence ✅
- [ ] Test 4: In-Memory Fallback ✅
- [ ] Test 5: Prisma Studio Inspection ✅
- [ ] Test 6: TypeScript Compilation ✅
- [ ] Test 7: Chat Message Persistence ✅
- [ ] Test 8: Production Docker Deployment ✅

---

## Expected Results

### ✅ SUCCESS Criteria:

1. **All data persists** across server restarts
2. **YouTube OAuth stays connected** after restart
3. **TypeScript compiles** without errors
4. **In-memory fallback works** when PostgreSQL unavailable
5. **Docker deployment** runs successfully

### ❌ FAILURE Indicators:

1. Data disappears after restart
2. YouTube shows "Not Connected" after restart
3. TypeScript or build errors
4. Server crashes when PostgreSQL unavailable
5. Docker containers fail health checks

---

## Troubleshooting Failed Tests

### If Test 2 Fails (YouTube Not Connected):

1. **Check DATABASE_URL:**
   ```bash
   echo $DATABASE_URL
   # Should be: postgresql://omnistream:changeme@localhost:5432/omnistream
   ```

2. **Verify tokens in database:**
   ```bash
   npx prisma studio
   # Check OAuthToken table
   ```

3. **Check server logs:**
   ```bash
   npm run dev
   # Look for database connection errors
   ```

### If Build Fails:

1. **Regenerate Prisma client:**
   ```bash
   npx prisma generate
   npm run build
   ```

2. **Check Prisma schema:**
   ```bash
   npx prisma validate
   ```

### If PostgreSQL Connection Fails:

1. **Verify PostgreSQL is running:**
   ```bash
   docker compose ps postgres
   # OR
   pg_isready -h localhost -p 5432 -U omnistream
   ```

2. **Check credentials:**
   ```bash
   psql postgresql://omnistream:changeme@localhost:5432/omnistream
   ```

3. **Reset database:**
   ```bash
   docker compose down -v
   docker compose up -d postgres
   npx prisma migrate deploy
   ```

---

## Next Steps After Testing

1. ✅ Mark all tests as passing
2. ✅ Commit changes to git
3. ✅ Update main README with PostgreSQL setup
4. ✅ Deploy to production environment
5. ✅ Monitor logs for any database errors
6. ✅ Set up automated backups

---

## Conclusion

This test plan ensures the PostgreSQL migration is complete and working correctly. All tests should pass before deploying to production.

**Critical Test:** Test 2 (OAuth persistence) is the primary issue this migration solves. If YouTube shows "Connected" after restart, the migration is successful! 🎉
