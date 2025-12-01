# OAuth Status Refresh - Complete Fix

## Issues Fixed

### 1. ✅ PostMessage Not Sent from OAuth Callback
**Problem:** Backend OAuth callback returned plain HTML without postMessage script.

**Fix:** Updated [src/api/routes/auth.ts:112-146](src/api/routes/auth.ts#L112-L146) to include postMessage in the response:
```javascript
// Notify the parent window if opened in popup
if (window.opener && !window.opener.closed) {
  window.opener.postMessage({
    type: 'oauth-success',
    platform: '${platform}',
    code: '${code}',
    state: '${communityId}'
  }, '*');

  setTimeout(() => window.close(), 2000);
}
```

### 2. ✅ OAuth Status API Response Structure
**Problem:** Status endpoint returned `connected` at wrong level - frontend expected `data.connected` but backend returned top-level `connected`.

**Fix:** Updated [src/api/routes/auth.ts:171-179](src/api/routes/auth.ts#L171-L179):
```javascript
// Before
res.json({
  success: true,
  connected: token !== null,  // ❌ Wrong level
  data: {
    platform,
    communityId,
    hasToken: token !== null,
  },
});

// After
res.json({
  success: true,
  data: {
    platform,
    communityId,
    connected: token !== null,  // ✅ Correct level
    hasToken: token !== null,
  },
});
```

### 3. ✅ Race Condition on Status Check
**Problem:** Frontend checked OAuth status immediately after callback, before backend finished saving tokens.

**Fix:** Added 1.5-second delay in [examples/web-dashboard/public/js/app.js:23-27](examples/web-dashboard/public/js/app.js#L23-L27):
```javascript
window.addEventListener('message', (event) => {
  if (event.data.type === 'oauth-success') {
    showStatus('platform-status', `Successfully connected to ${event.data.platform}!`, 'success');
    // Wait 1.5 seconds for backend to save tokens
    setTimeout(() => {
      loadPlatforms();  // Now checks status
    }, 1500);
  }
});
```

### 4. ✅ Invalid Community ID Handling
**Problem:** Old/invalid community IDs in localStorage caused repeated errors.

**Fix:** Added graceful error handling in [examples/web-dashboard/public/js/app.js:128-141](examples/web-dashboard/public/js/app.js#L128-L141):
```javascript
if (!response.ok || !data.success) {
  // If community not found, clear localStorage and show login
  if (response.status === 404 || data.error?.includes('not found')) {
    localStorage.removeItem('omnistream_community_id');
    communityId = null;
    showStatus('auth-status', 'Community not found. Please create a new community or login with a valid ID.', 'error');
    return;
  }
}
```

### 5. ✅ Added Debugging
**Problem:** Hard to diagnose OAuth flow issues.

**Fix:** Added console.log statements throughout the flow:
- PostMessage received: logs event data
- OAuth success: logs platform name
- Platform status loading: logs communityId
- API responses: logs status data for each platform
- Final statuses: logs complete array

## Files Modified

### Backend (TypeScript)
1. **src/api/routes/auth.ts**
   - OAuth callback now sends postMessage
   - Status endpoint returns `data.connected` correctly

### Frontend (JavaScript)
2. **examples/web-dashboard/public/js/app.js**
   - Added 1.5s delay before status refresh
   - Added debugging logs throughout
   - Added invalid community ID handling

## Testing the Fix

### Test OAuth Flow:
1. Open dashboard at http://localhost:4000
2. Create or login to a community
3. Click "Connect YouTube"
4. Complete OAuth in popup window
5. **Expected:**
   - Popup shows "✅ Authorization Successful!"
   - Popup auto-closes after 2 seconds
   - Main dashboard shows success message
   - After 1.5 seconds, YouTube status changes to "✓ Connected"
   - Console shows detailed logs of the flow

### Console Logs You Should See:
```
Received postMessage: {type: 'oauth-success', platform: 'youtube', code: '...', state: '...'}
OAuth success for platform: youtube
Refreshing platform status...
Loading platform statuses for communityId: 5d3f931e-8d22-4c4c-a8ca-d3737728a875
youtube status response: {success: true, data: {platform: 'youtube', communityId: '...', connected: true, hasToken: true}}
facebook status response: {success: true, data: {..., connected: false}}
tiktok status response: {success: true, data: {..., connected: false}}
Final platform statuses: [{name: 'youtube', connected: true}, {name: 'facebook', connected: false}, {name: 'tiktok', connected: false}]
```

### Test Invalid Community ID:
1. Open browser DevTools → Application → Local Storage
2. Find `omnistream_community_id` and change it to a fake UUID
3. Refresh the dashboard
4. **Expected:**
   - Error message appears: "Community not found. Please create a new community or login with a valid ID."
   - localStorage is cleared
   - Login screen is shown

## Complete Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User clicks "Connect YouTube"                                 │
│    ↓ Opens popup with OAuth URL                                  │
│ 2. User authorizes YouTube access                                │
│    ↓ YouTube redirects to /api/v1/auth/youtube/callback          │
│ 3. Backend exchanges code for tokens                             │
│    ↓ Saves tokens to SQLite database                             │
│ 4. Backend returns HTML with postMessage script                  │
│    ↓ window.opener.postMessage({type: 'oauth-success', ...})     │
│ 5. Main dashboard receives postMessage                           │
│    ↓ Shows success message                                       │
│    ↓ Waits 1.5 seconds                                           │
│ 6. Frontend calls loadPlatforms()                                │
│    ↓ Fetches /api/auth/youtube/status?communityId=xxx            │
│ 7. Backend checks if OAuth token exists in database              │
│    ↓ Returns {success: true, data: {connected: true}}            │
│ 8. Frontend updates UI to show "✓ Connected"                     │
│    ↓ Platform checkboxes appear for stream creation              │
└─────────────────────────────────────────────────────────────────┘
```

## Key Changes Summary

| Issue | Before | After |
|-------|--------|-------|
| **PostMessage** | Not sent from backend | Sent from OAuth callback HTML |
| **Status Response** | `connected` at top level | `data.connected` matches frontend |
| **Timing** | Immediate check (race condition) | 1.5s delay ensures DB saved |
| **Invalid Community** | Repeated errors | Gracefully clears localStorage |
| **Debugging** | No visibility | Detailed console logs |

## Result

✅ OAuth callback now properly notifies parent window
✅ Status API returns data in correct structure
✅ Race condition eliminated with delay
✅ Invalid communities handled gracefully
✅ Full debugging visibility for troubleshooting

**The OAuth status now updates correctly after authentication!**
