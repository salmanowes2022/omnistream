# Facebook OAuth - Quick Start Guide

## TL;DR - 5 Minute Setup

### 1. Get Facebook Credentials (2 min)

1. Go to https://developers.facebook.com/apps/
2. Create App → Business → Name it
3. Copy **App ID** and **App Secret**
4. Add OAuth redirect: `http://localhost:3000/api/v1/auth/facebook/callback`

### 2. Create a Facebook Page (1 min)

⚠️ **Required!** Personal profiles can't stream.

Go to https://www.facebook.com/pages/create and create a page.

### 3. Configure .env (30 sec)

```bash
FACEBOOK_APP_ID=your_app_id_here
FACEBOOK_APP_SECRET=your_app_secret_here
FACEBOOK_REDIRECT_URI=http://localhost:3000/api/v1/auth/facebook/callback
```

### 4. Start Servers (1 min)

Terminal 1:
```bash
npm run dev
```

Terminal 2:
```bash
cd examples/web-dashboard
npm start
```

### 5. Test (30 sec)

1. Open http://localhost:8080
2. Create/login to community
3. Click "Connect Facebook"
4. Create stream with Facebook checkbox
5. Click "Start Stream"

**Done!** 🎉

## Verify It Works

You should see:
- ✓ Facebook shows as "Connected" in dashboard
- ✓ Facebook checkbox available in stream creation
- ✓ Stream status shows "🔴 LIVE" after starting
- ✓ Live video appears on your Facebook Page

## Troubleshooting

### "No Facebook pages found"
→ Make sure you created a Facebook Page (not just a profile)
→ Select your page in the OAuth dialog

### "OAuth callback failed"
→ Check `FACEBOOK_REDIRECT_URI` matches exactly in .env and Facebook App settings
→ Verify App ID and Secret are correct

### More Help

See [FACEBOOK_TESTING.md](FACEBOOK_TESTING.md) for detailed testing instructions.

## Next Steps

- Stream to Facebook + YouTube simultaneously (check both boxes)
- Use OBS to stream actual video content (RTMP details in stream card)
- View live stream on your Facebook Page

## API Endpoints (Already Working)

```bash
# Get OAuth URL
GET /api/v1/auth/facebook/authorize?communityId={id}

# Check connection status
GET /api/v1/auth/facebook/status?communityId={id}

# Disconnect
DELETE /api/v1/auth/facebook?communityId={id}
```

**Everything is already implemented!** Just add your Facebook App credentials and test.
