# Facebook Live Streaming - Testing Guide

This guide explains how to test the Facebook OAuth and live streaming integration in Omnistream.

## Prerequisites

### 1. Create a Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/apps/)
2. Click "Create App"
3. Choose "Business" as the app type
4. Fill in the app details:
   - **App Name**: Choose a name (e.g., "Omnistream Dev")
   - **App Contact Email**: Your email
5. Click "Create App"

### 2. Configure Facebook App

1. In your app dashboard, go to **Settings** → **Basic**
2. Note your **App ID** and **App Secret**
3. Add your domain to **App Domains** (for local dev: `localhost`)

4. Go to **Facebook Login** → **Settings**:
   - Add Valid OAuth Redirect URIs:
     ```
     http://localhost:3000/api/v1/auth/facebook/callback
     ```
   - Enable "Use Strict Mode for Redirect URIs"

5. Go to **App Review** → **Permissions and Features**:
   - Request the following permissions:
     - `pages_manage_posts`
     - `pages_read_engagement`
     - `pages_manage_engagement`
     - `pages_show_list`
     - `publish_video`

### 3. Create a Facebook Page

**IMPORTANT**: You MUST have a Facebook Page to stream. Personal profiles cannot stream.

1. Go to [Facebook Pages](https://www.facebook.com/pages/create)
2. Create a new page:
   - Choose a category (e.g., "Brand" or "Community")
   - Add a page name
   - Add a description
3. Complete the page setup

## Environment Setup

### 1. Configure Environment Variables

Edit your `.env` file:

```bash
# Facebook OAuth
FACEBOOK_APP_ID=your_app_id_here
FACEBOOK_APP_SECRET=your_app_secret_here
FACEBOOK_REDIRECT_URI=http://localhost:3000/api/v1/auth/facebook/callback

# Keep your existing YouTube and other settings
```

### 2. Verify Dependencies

Make sure all dependencies are installed:

```bash
npm install
```

### 3. Run Database Migrations

If you haven't already:

```bash
npx prisma generate
npx prisma migrate dev
```

## Testing the Facebook Integration

### Step 1: Start the Backend Server

```bash
npm run dev
```

The server should start on `http://localhost:3000`

### Step 2: Start the Dashboard

Open a new terminal:

```bash
cd examples/web-dashboard
npm start
```

The dashboard should open at `http://localhost:8080`

### Step 3: Create/Login to Community

1. Open the dashboard in your browser
2. Either:
   - **Create a new community**: Enter a name and click "Create Community"
   - **Login with existing ID**: Enter your community ID and click "Login"
3. Save your Community ID for future use

### Step 4: Connect Facebook

1. In the **Platforms** section, find the Facebook card
2. Click "Connect Facebook"
3. A popup window will open with Facebook login
4. Login with your Facebook account
5. **IMPORTANT**: When asked "Choose a Page", select the Facebook Page you created earlier
6. Grant all requested permissions
7. The popup should close automatically and show "✅ Authorization Successful!"
8. The dashboard should now show Facebook as "✓ Connected"

**Troubleshooting OAuth:**
- If the popup doesn't close, manually close it and refresh the dashboard
- Check the browser console for any errors
- Verify your `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, and `FACEBOOK_REDIRECT_URI` in `.env`
- Make sure the redirect URI matches exactly in both `.env` and Facebook App settings

### Step 5: Create a Stream with Facebook

1. In the **Create Stream** section:
   - **Title**: Enter a stream title (e.g., "Test Facebook Live Stream")
   - **Description**: (Optional) Add a description
   - **Platforms**: Check the "facebook" checkbox (you can also check "youtube" for multi-platform)
2. Click "Create Stream"
3. You should see a success message and the stream card appear below

### Step 6: Start the Stream

1. Find your stream in the **Active Streams** section
2. Click "▶ Start Stream"
3. Wait a moment - the status should change to "🟡 Starting..."
4. Once live, the status should show "🔴 LIVE"
5. You should see:
   - **Platform Status**: Shows "facebook" with status "LIVE"
   - **Watch Link**: A link to view the live stream on Facebook
   - **RTMP Details**: If available, the RTMP URL and stream key

**Note**: The stream will be created on your Facebook Page as a Live Video.

### Step 7: Verify the Stream on Facebook

1. Go to your Facebook Page
2. You should see a live video post
3. You can watch it from there or use the "Watch" link in the dashboard
4. The stream will show "Waiting for video" until you start streaming video to the RTMP endpoint

### Step 8: Stop the Stream

1. In the dashboard, click "⏹ Stop Stream"
2. The status should change to "⚫ Idle" or "ENDED"
3. The live video on Facebook will end

## Testing with OBS

If you want to actually stream video content to Facebook:

1. Create and start a stream in the dashboard
2. Look for the RTMP settings in the stream card
3. Open OBS Studio
4. Go to **Settings** → **Stream**
5. Set:
   - **Service**: Custom
   - **Server**: Copy the RTMP URL from the dashboard
   - **Stream Key**: Copy the Stream Key from the dashboard
6. Click OK and start streaming in OBS
7. Your stream should appear live on Facebook

## Testing Checklist

- [ ] Backend server starts without errors
- [ ] Dashboard loads successfully
- [ ] Can create/login to a community
- [ ] Facebook appears in the platforms list
- [ ] "Connect Facebook" button opens OAuth popup
- [ ] Can login and grant permissions to Facebook app
- [ ] OAuth callback succeeds and popup closes
- [ ] Dashboard shows Facebook as "✓ Connected"
- [ ] Facebook checkbox appears in "Create Stream" form
- [ ] Can create a stream with Facebook platform selected
- [ ] Stream appears in the streams list
- [ ] "Start Stream" button works
- [ ] Stream status changes to "🟡 Starting..." then "🔴 LIVE"
- [ ] Platform status shows Facebook as "LIVE"
- [ ] Watch link opens the live video on Facebook
- [ ] Live video appears on the Facebook Page
- [ ] "Stop Stream" button works
- [ ] Stream status changes to ended/idle

## Common Issues

### "No Facebook pages found"

**Problem**: Error message saying "No Facebook pages found. You need a Facebook Page to go live."

**Solution**:
1. Make sure you have created a Facebook Page
2. When connecting Facebook, make sure to select your page in the OAuth dialog
3. Re-connect Facebook if needed

### "Failed to create stream" Error

**Problem**: Error when creating a stream on Facebook.

**Solutions**:
1. Make sure you have all required permissions granted
2. Check that your Facebook Page has live streaming enabled
3. Some Facebook accounts may have restrictions - check [Facebook Live Policies](https://www.facebook.com/policies/live)
4. Check the backend logs for detailed error messages

### OAuth Callback Fails

**Problem**: Popup window shows an error or doesn't close.

**Solutions**:
1. Verify `FACEBOOK_REDIRECT_URI` in `.env` matches the one in Facebook App settings exactly
2. Make sure your Facebook App is in "Development" mode (for testing)
3. Check that `FACEBOOK_APP_ID` and `FACEBOOK_APP_SECRET` are correct
4. Clear browser cookies and try again

### Stream Stays in "Starting" State

**Problem**: Stream status shows "Starting..." but never goes to "LIVE".

**Solutions**:
1. Check backend logs for API errors
2. Verify your Facebook Page has live streaming permissions
3. Try stopping and restarting the stream
4. Re-connect Facebook OAuth

## Multi-Platform Streaming

You can stream to Facebook and YouTube simultaneously:

1. Connect both YouTube and Facebook platforms
2. When creating a stream, check both "youtube" and "facebook"
3. Click "Create Stream"
4. Both platforms will be set up
5. Click "Start Stream" to go live on both platforms at once

## API Testing (Optional)

You can also test the API directly using curl:

### Get OAuth Authorization URL

```bash
curl "http://localhost:3000/api/v1/auth/facebook/authorize?communityId=YOUR_COMMUNITY_ID"
```

### Check Connection Status

```bash
curl "http://localhost:3000/api/v1/auth/facebook/status?communityId=YOUR_COMMUNITY_ID"
```

### Disconnect Facebook

```bash
curl -X DELETE "http://localhost:3000/api/v1/auth/facebook?communityId=YOUR_COMMUNITY_ID"
```

## Support

If you encounter issues not covered here:

1. Check the backend logs: `npm run dev` output
2. Check browser console for errors
3. Review the Facebook App dashboard for any alerts
4. Check [Facebook Graph API Documentation](https://developers.facebook.com/docs/graph-api)
5. File an issue on the GitHub repository

## Next Steps

- Set up a production Facebook App for deployment
- Configure webhooks for real-time stream updates
- Implement chat message polling for Facebook Live comments
- Add analytics and viewer count tracking
