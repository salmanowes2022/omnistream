# OmniStream Installation Guide

Quick guide to get OmniStream running locally in under 5 minutes.

## Prerequisites

- **Node.js** 18+ ([download here](https://nodejs.org/))
- **Git** ([download here](https://git-scm.com/))

## Installation Steps

### 1. Clone & Install Backend

```bash
git clone <repository-url>
cd omnistream
npm install
```

### 2. Setup Database

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 3. Configure Environment

The `.env` file is already configured for local development.

**Important:** OAuth callbacks are set to `localhost:3000`. This works out of the box for YouTube and Facebook.

### 4. Start Backend Server

**Option A - Backend Only (Simplest):**

```bash
npm run dev
```

The backend API starts at: **<http://localhost:3000>**

You can now:

- Create accounts at `http://localhost:3000` (serves basic UI)
- Use the REST API directly (see API docs)

**Option B - Backend + Web Dashboard (Full UI Experience):**

Open **two terminal windows**:

**Terminal 1 - Backend API:**

```bash
npm run dev
# Runs on http://localhost:3000
```

**Terminal 2 - Web Dashboard:**

```bash
cd examples/web-dashboard
npm install
npm start
# Runs on http://localhost:4000
```

Then open **<http://localhost:4000>** for the full dashboard UI!

## First Use

1. Open **<http://localhost:3000>** in your browser
2. Click **Register** tab
3. Create an account with:
   - Name
   - Email
   - Password (min 8 chars, 1 uppercase, 1 number)
4. You'll be redirected to the dashboard automatically

## What You Can Do

### Without OAuth Setup

- ✅ Create account & login
- ✅ Create streams
- ✅ View dashboard
- ✅ Schedule posts

### With OAuth Setup (Optional)

To connect YouTube, Facebook, etc., you need OAuth credentials.

**Quick OAuth Setup:**

1. **YouTube:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create project → Enable YouTube Data API v3
   - Create OAuth credentials
   - Add redirect: `http://localhost:3000/api/v1/platforms/youtube/callback`
   - Copy Client ID & Secret to `.env`

2. **Facebook:**
   - Go to [Facebook Developers](https://developers.facebook.com/)
   - Create app → Get App ID & Secret
   - Add redirect: `http://localhost:3000/api/v1/platforms/facebook/callback`
   - Copy to `.env`

## Common Issues

**Port 3000 already in use?**

```bash
# Find what's using port 3000
lsof -i :3000

# Kill it
kill -9 <PID>
```

**Database errors?**

```bash
# Reset database
npx prisma migrate reset
npx prisma generate
```

**Build errors?**

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Project Structure

```text
omnistream/
├── src/                    # Backend source code
│   ├── api/               # API routes & middleware
│   ├── services/          # Business logic
│   └── types/             # TypeScript types
├── examples/web-dashboard/ # Frontend dashboard
│   ├── views/             # EJS templates
│   ├── public/            # CSS, JS, assets
│   └── server.js          # Express server
├── prisma/                # Database schema
└── .env                   # Configuration
```

## Need Help?

**Check the logs:**

```bash
# Backend logs show in terminal where you ran npm run dev
# Look for errors in red
```

**Test the API:**

```bash
# Health check
curl http://localhost:3000/health

# Create user (test)
curl -X POST http://localhost:3000/api/v1/user-auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test1234","name":"Test User"}'
```

## Development Tips

- **Auto-restart:** The dev server auto-restarts on code changes
- **Database UI:** Run `npx prisma studio` to view database in browser
- **API Docs:** Check `/docs` folder for API documentation
- **Logs:** All server logs show in terminal

## What's Included

✅ User authentication (JWT-based)
✅ Modern login/register UI
✅ Multi-platform OAuth support
✅ Stream management
✅ Post scheduling
✅ Real-time chat (WebSocket)
✅ SQLite database (zero config)

---

**That's it! You're ready to stream.** 🚀

For questions, check the [README.md](./README.md) or create an issue.
