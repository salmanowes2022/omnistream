/**
 * User Platform Connection Management
 * Handles UI for connecting/disconnecting Twitter, Telegram, and YouTube
 */

/**
 * Get JWT authentication token from localStorage
 */
function getUserAuthToken() {
  return localStorage.getItem('omnistream_jwt_token');
}

/**
 * Make authenticated API request to backend
 */
async function userPlatformRequest(url, options = {}) {
  const token = getUserAuthToken();

  if (!token) {
    throw new Error('Not authenticated. Please login first.');
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || data.error || 'Request failed');
  }

  return data;
}

/**
 * Load and display all connected user platforms
 */
async function loadUserPlatforms() {
  try {
    const response = await userPlatformRequest('/api/v1/platforms');
    const platforms = response.data.platforms;

    // Update UI for each platform
    updateUserPlatformStatus(
      'youtube',
      platforms.find((p) => p.platform === 'youtube')
    );
    updateUserPlatformStatus(
      'twitter',
      platforms.find((p) => p.platform === 'twitter')
    );
    updateUserPlatformStatus(
      'telegram',
      platforms.find((p) => p.platform === 'telegram')
    );
    updateUserPlatformStatus(
      'facebook',
      platforms.find((p) => p.platform === 'facebook')
    );
    updateUserPlatformStatus(
      'instagram',
      platforms.find((p) => p.platform === 'instagram')
    );
    updateUserPlatformStatus(
      'tiktok',
      platforms.find((p) => p.platform === 'tiktok')
    );

    return platforms;
  } catch (error) {
    console.error('Failed to load user platforms:', error);
    showUserPlatformError('Failed to load connected platforms');
    return [];
  }
}

/**
 * Update platform UI status
 */
function updateUserPlatformStatus(platform, data) {
  const statusEl = document.getElementById(`user-${platform}-status`);
  const connectBtn = document.getElementById(`user-connect-${platform}`);
  const disconnectBtn = document.getElementById(`user-disconnect-${platform}`);
  const infoEl = document.getElementById(`user-${platform}-info`);

  if (data) {
    // Platform is connected
    if (statusEl) {
      statusEl.textContent = 'Connected';
      statusEl.className = 'status-badge connected';
    }

    if (connectBtn) connectBtn.style.display = 'none';
    if (disconnectBtn) disconnectBtn.style.display = 'inline-block';

    // Show platform-specific info
    if (infoEl && data.extra) {
      let infoText = '';

      if (platform === 'youtube') {
        infoText = `Channel: ${data.extra.channelTitle || 'Unknown'}`;
      } else if (platform === 'twitter') {
        infoText = `@${data.extra.username || 'Unknown'}`;
      } else if (platform === 'telegram') {
        infoText = `Bot: @${data.extra.botUsername || 'Unknown'}`;
      } else if (platform === 'facebook') {
        infoText = `${data.extra.name || 'Unknown'}`;
      } else if (platform === 'instagram') {
        infoText = `@${data.extra.username || 'Unknown'}`;
      } else if (platform === 'tiktok') {
        infoText = `RTMP: ${data.extra.rtmpServer || 'Unknown'}`;
      }

      infoEl.textContent = infoText;
      infoEl.style.display = 'block';
    }
  } else {
    // Platform is not connected
    if (statusEl) {
      statusEl.textContent = 'Not Connected';
      statusEl.className = 'status-badge disconnected';
    }

    if (connectBtn) connectBtn.style.display = 'inline-block';
    if (disconnectBtn) disconnectBtn.style.display = 'none';
    if (infoEl) infoEl.style.display = 'none';
  }
}

/**
 * Connect Twitter
 */
async function connectUserTwitter() {
  try {
    showUserPlatformLoading('Connecting to Twitter...');

    const response = await userPlatformRequest('/api/v1/platforms/twitter/connect', {
      method: 'POST',
    });

    const authUrl = response.data.authUrl;

    // Open OAuth popup
    const popup = window.open(authUrl, 'Twitter OAuth', 'width=600,height=700,scrollbars=yes');

    // Listen for OAuth success message
    window.addEventListener('message', function handler(event) {
      if (event.data.type === 'platform-connected' && event.data.platform === 'twitter') {
        window.removeEventListener('message', handler);
        hideUserPlatformLoading();
        showUserPlatformSuccess('Twitter connected successfully!');
        loadUserPlatforms();
        if (popup && !popup.closed) {
          popup.close();
        }
      }
    });
  } catch (error) {
    hideUserPlatformLoading();
    showUserPlatformError(`Failed to connect Twitter: ${error.message}`);
  }
}

/**
 * Connect Telegram - Show modal for bot token input
 */
function connectUserTelegram() {
  const modal = document.getElementById('user-telegram-modal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

/**
 * Submit Telegram connection
 */
async function submitUserTelegramConnection() {
  const botToken = document.getElementById('user-telegram-bot-token')?.value.trim();
  const channelId = document.getElementById('user-telegram-channel-id')?.value.trim();

  if (!botToken || !channelId) {
    showUserPlatformError('Please provide both bot token and channel ID');
    return;
  }

  try {
    showUserPlatformLoading('Connecting to Telegram...');

    await userPlatformRequest('/api/v1/platforms/telegram/connect', {
      method: 'POST',
      body: JSON.stringify({ botToken, channelId }),
    });

    hideUserPlatformLoading();
    closeUserTelegramModal();
    showUserPlatformSuccess('Telegram connected successfully!');
    loadUserPlatforms();
  } catch (error) {
    hideUserPlatformLoading();
    showUserPlatformError(`Failed to connect Telegram: ${error.message}`);
  }
}

/**
 * Close Telegram modal
 */
function closeUserTelegramModal() {
  const modal = document.getElementById('user-telegram-modal');
  if (modal) {
    modal.style.display = 'none';
    // Clear inputs
    const botTokenInput = document.getElementById('user-telegram-bot-token');
    const channelIdInput = document.getElementById('user-telegram-channel-id');
    if (botTokenInput) botTokenInput.value = '';
    if (channelIdInput) channelIdInput.value = '';
  }
}

/**
 * Connect YouTube
 */
async function connectUserYouTube() {
  try {
    showUserPlatformLoading('Connecting to YouTube...');

    const response = await userPlatformRequest('/api/v1/platforms/youtube/connect', {
      method: 'POST',
    });

    const authUrl = response.data.authUrl;

    // Open OAuth popup
    const popup = window.open(authUrl, 'YouTube OAuth', 'width=600,height=700,scrollbars=yes');

    // Listen for OAuth success message
    window.addEventListener('message', function handler(event) {
      if (event.data.type === 'platform-connected' && event.data.platform === 'youtube') {
        window.removeEventListener('message', handler);
        hideUserPlatformLoading();
        showUserPlatformSuccess('YouTube connected successfully!');
        loadUserPlatforms();
        if (popup && !popup.closed) {
          popup.close();
        }
      }
    });
  } catch (error) {
    hideUserPlatformLoading();
    showUserPlatformError(`Failed to connect YouTube: ${error.message}`);
  }
}

/**
 * Connect Facebook
 */
async function connectUserFacebook() {
  try {
    showUserPlatformLoading('Connecting to Facebook...');

    const response = await userPlatformRequest('/api/v1/platforms/facebook/connect', {
      method: 'POST',
    });

    const authUrl = response.data.authUrl;

    // Open OAuth popup
    const popup = window.open(authUrl, 'Facebook OAuth', 'width=600,height=700,scrollbars=yes');

    // Listen for OAuth success message
    window.addEventListener('message', function handler(event) {
      if (event.data.type === 'platform-connected' && event.data.platform === 'facebook') {
        window.removeEventListener('message', handler);
        hideUserPlatformLoading();
        showUserPlatformSuccess('Facebook connected successfully!');
        loadUserPlatforms();
        if (popup && !popup.closed) {
          popup.close();
        }
      }
    });
  } catch (error) {
    hideUserPlatformLoading();
    showUserPlatformError(`Failed to connect Facebook: ${error.message}`);
  }
}

/**
 * Connect Instagram
 */
async function connectUserInstagram() {
  try {
    showUserPlatformLoading('Connecting to Instagram...');

    const response = await userPlatformRequest('/api/v1/platforms/instagram/connect', {
      method: 'POST',
    });

    const authUrl = response.data.authUrl;

    // Open OAuth popup
    const popup = window.open(authUrl, 'Instagram OAuth', 'width=600,height=700,scrollbars=yes');

    // Listen for OAuth success message
    window.addEventListener('message', function handler(event) {
      if (event.data.type === 'platform-connected' && event.data.platform === 'instagram') {
        window.removeEventListener('message', handler);
        hideUserPlatformLoading();
        showUserPlatformSuccess('Instagram connected successfully!');
        loadUserPlatforms();
        if (popup && !popup.closed) {
          popup.close();
        }
      }
    });
  } catch (error) {
    hideUserPlatformLoading();
    showUserPlatformError(`Failed to connect Instagram: ${error.message}`);
  }
}

/**
 * Connect TikTok - Show modal for RTMP credentials input
 */
function connectUserTikTok() {
  const modal = document.getElementById('user-tiktok-modal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

/**
 * Submit TikTok connection
 */
async function submitUserTikTokConnection() {
  const rtmpServer = document.getElementById('user-tiktok-rtmp-server')?.value.trim();
  const streamKey = document.getElementById('user-tiktok-stream-key')?.value.trim();

  if (!rtmpServer || !streamKey) {
    showUserPlatformError('Please provide both RTMP server and stream key');
    return;
  }

  try {
    showUserPlatformLoading('Connecting to TikTok...');

    await userPlatformRequest('/api/v1/platforms/tiktok/connect', {
      method: 'POST',
      body: JSON.stringify({ rtmpServer, streamKey }),
    });

    hideUserPlatformLoading();
    closeUserTikTokModal();
    showUserPlatformSuccess('TikTok connected successfully!');
    loadUserPlatforms();
  } catch (error) {
    hideUserPlatformLoading();
    showUserPlatformError(`Failed to connect TikTok: ${error.message}`);
  }
}

/**
 * Close TikTok modal
 */
function closeUserTikTokModal() {
  const modal = document.getElementById('user-tiktok-modal');
  if (modal) {
    modal.style.display = 'none';
    // Clear inputs
    const rtmpServerInput = document.getElementById('user-tiktok-rtmp-server');
    const streamKeyInput = document.getElementById('user-tiktok-stream-key');
    if (rtmpServerInput) rtmpServerInput.value = '';
    if (streamKeyInput) streamKeyInput.value = '';
  }
}

/**
 * Disconnect a user platform
 */
async function disconnectUserPlatform(platform) {
  if (!confirm(`Are you sure you want to disconnect ${platform}?`)) {
    return;
  }

  try {
    showUserPlatformLoading(`Disconnecting ${platform}...`);

    await userPlatformRequest(`/api/v1/platforms/${platform}`, {
      method: 'DELETE',
    });

    hideUserPlatformLoading();
    showUserPlatformSuccess(`${platform} disconnected successfully!`);
    loadUserPlatforms();
  } catch (error) {
    hideUserPlatformLoading();
    showUserPlatformError(`Failed to disconnect ${platform}: ${error.message}`);
  }
}

/**
 * Show loading indicator
 */
function showUserPlatformLoading(message) {
  const loadingEl = document.getElementById('user-platform-loading');
  if (loadingEl) {
    loadingEl.textContent = message;
    loadingEl.style.display = 'block';
  }
}

/**
 * Hide loading indicator
 */
function hideUserPlatformLoading() {
  const loadingEl = document.getElementById('user-platform-loading');
  if (loadingEl) {
    loadingEl.style.display = 'none';
  }
}

/**
 * Show success message
 */
function showUserPlatformSuccess(message) {
  const alertEl = document.getElementById('user-platform-success');
  if (alertEl) {
    alertEl.textContent = message;
    alertEl.style.display = 'block';
    setTimeout(() => {
      alertEl.style.display = 'none';
    }, 5000);
  }
  // Also show toast
  showToast(message, 'success');
}

/**
 * Show error message
 */
function showUserPlatformError(message) {
  const alertEl = document.getElementById('user-platform-error');
  if (alertEl) {
    alertEl.textContent = message;
    alertEl.style.display = 'block';
    setTimeout(() => {
      alertEl.style.display = 'none';
    }, 5000);
  }
  // Also show toast
  showToast(message, 'error');
}

// Export functions for global access
window.userPlatforms = {
  loadUserPlatforms,
  connectUserTwitter,
  connectUserTelegram,
  connectUserYouTube,
  connectUserFacebook,
  connectUserInstagram,
  connectUserTikTok,
  disconnectUserPlatform,
  submitUserTelegramConnection,
  closeUserTelegramModal,
  submitUserTikTokConnection,
  closeUserTikTokModal,
};
