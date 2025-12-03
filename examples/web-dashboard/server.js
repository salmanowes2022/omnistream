const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.DASHBOARD_PORT || 4000;
const OMNISTREAM_API_URL = process.env.OMNISTREAM_API_URL || 'http://localhost:3000';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// In-memory session storage (for demo purposes)
const sessions = new Map();

// Routes
app.get('/', (req, res) => {
  res.render('index', {
    omnistreamUrl: OMNISTREAM_API_URL,
  });
});

// API proxy endpoints to avoid CORS issues

// Create a new community (registration)
app.post('/api/communities', async (req, res) => {
  try {
    const response = await axios.post(`${OMNISTREAM_API_URL}/api/v1/communities`, req.body);
    res.json(response.data);
  } catch (error) {
    res
      .status(error.response?.status || 500)
      .json(error.response?.data || { error: 'Failed to create community', success: false });
  }
});

// List all communities
app.get('/api/communities', async (req, res) => {
  try {
    const response = await axios.get(`${OMNISTREAM_API_URL}/api/v1/communities`);
    res.json(response.data);
  } catch (error) {
    res
      .status(error.response?.status || 500)
      .json(error.response?.data || { error: 'Failed to fetch communities', success: false });
  }
});

// Get community info by ID (used for profile display)
app.get('/api/community/:communityId', async (req, res) => {
  try {
    const { communityId } = req.params;
    if (!communityId) {
      return res.status(400).json({ success: false, error: 'Community ID required' });
    }

    // Check if request has auth token
    const authHeader = req.headers.authorization;
    const headers = {};
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    // List all communities and find the one with matching ID
    const response = await axios.get(`${OMNISTREAM_API_URL}/api/v1/communities`, {
      headers,
    });
    const communities = response.data.data || [];
    const community = communities.find((c) => c.id === communityId);

    if (!community) {
      return res.status(404).json({ success: false, error: 'Community not found' });
    }

    res.json({ success: true, data: community });
  } catch (error) {
    res
      .status(error.response?.status || 500)
      .json(error.response?.data || { error: 'Failed to fetch community', success: false });
  }
});

// User Platforms proxy endpoints (Twitter, Telegram, YouTube)

// Get all connected user platforms
app.get('/api/v1/platforms', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const response = await axios.get(`${OMNISTREAM_API_URL}/api/v1/platforms`, {
      headers: {
        Authorization: authHeader,
      },
    });
    res.json(response.data);
  } catch (error) {
    res
      .status(error.response?.status || 500)
      .json(error.response?.data || { error: 'Failed to fetch platforms', success: false });
  }
});

// Connect Twitter
app.post('/api/v1/platforms/twitter/connect', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const response = await axios.post(
      `${OMNISTREAM_API_URL}/api/v1/platforms/twitter/connect`,
      req.body,
      {
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
      }
    );
    res.json(response.data);
  } catch (error) {
    res
      .status(error.response?.status || 500)
      .json(error.response?.data || { error: 'Failed to connect Twitter', success: false });
  }
});

// Connect Telegram
app.post('/api/v1/platforms/telegram/connect', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const response = await axios.post(
      `${OMNISTREAM_API_URL}/api/v1/platforms/telegram/connect`,
      req.body,
      {
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
      }
    );
    res.json(response.data);
  } catch (error) {
    res
      .status(error.response?.status || 500)
      .json(error.response?.data || { error: 'Failed to connect Telegram', success: false });
  }
});

// Connect YouTube
app.post('/api/v1/platforms/youtube/connect', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const response = await axios.post(
      `${OMNISTREAM_API_URL}/api/v1/platforms/youtube/connect`,
      req.body,
      {
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
      }
    );
    res.json(response.data);
  } catch (error) {
    res
      .status(error.response?.status || 500)
      .json(error.response?.data || { error: 'Failed to connect YouTube', success: false });
  }
});

// Disconnect platform
app.delete('/api/v1/platforms/:platform', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const response = await axios.delete(
      `${OMNISTREAM_API_URL}/api/v1/platforms/${req.params.platform}`,
      {
        headers: {
          Authorization: authHeader,
        },
      }
    );
    res.json(response.data);
  } catch (error) {
    res
      .status(error.response?.status || 500)
      .json(error.response?.data || { error: 'Failed to disconnect platform', success: false });
  }
});

// Check platform status
app.get('/api/v1/platforms/:platform/status', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const response = await axios.get(
      `${OMNISTREAM_API_URL}/api/v1/platforms/${req.params.platform}/status`,
      {
        headers: {
          Authorization: authHeader,
        },
      }
    );
    res.json(response.data);
  } catch (error) {
    res
      .status(error.response?.status || 500)
      .json(error.response?.data || { error: 'Failed to check platform status', success: false });
  }
});

// User authentication proxy endpoints

// User registration
app.post('/api/v1/user-auth/register', async (req, res) => {
  try {
    const response = await axios.post(`${OMNISTREAM_API_URL}/api/v1/user-auth/register`, req.body);
    res.json(response.data);
  } catch (error) {
    res
      .status(error.response?.status || 500)
      .json(error.response?.data || { error: 'Registration failed', success: false });
  }
});

// User login
app.post('/api/v1/user-auth/login', async (req, res) => {
  try {
    const response = await axios.post(`${OMNISTREAM_API_URL}/api/v1/user-auth/login`, req.body);
    res.json(response.data);
  } catch (error) {
    res
      .status(error.response?.status || 500)
      .json(error.response?.data || { error: 'Login failed', success: false });
  }
});

// Get current user
app.get('/api/v1/user-auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const response = await axios.get(`${OMNISTREAM_API_URL}/api/v1/user-auth/me`, {
      headers: {
        Authorization: authHeader,
      },
    });
    res.json(response.data);
  } catch (error) {
    res
      .status(error.response?.status || 500)
      .json(error.response?.data || { error: 'Failed to get user info', success: false });
  }
});

// List user's communities
app.get('/api/v1/communities', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const response = await axios.get(`${OMNISTREAM_API_URL}/api/v1/communities`, {
      headers: {
        Authorization: authHeader,
      },
    });
    res.json(response.data);
  } catch (error) {
    res
      .status(error.response?.status || 500)
      .json(error.response?.data || { error: 'Failed to fetch communities', success: false });
  }
});

// Create community (authenticated)
app.post('/api/v1/communities', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const response = await axios.post(`${OMNISTREAM_API_URL}/api/v1/communities`, req.body, {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    });
    res.json(response.data);
  } catch (error) {
    res
      .status(error.response?.status || 500)
      .json(error.response?.data || { error: 'Failed to create community', success: false });
  }
});

// Get OAuth status for platforms
app.get('/api/platforms', async (req, res) => {
  try {
    const communityId = req.query.communityId;
    if (!communityId) {
      return res.status(400).json({ success: false, error: 'Community ID required' });
    }

    // Get community info
    const communitiesResponse = await axios.get(`${OMNISTREAM_API_URL}/api/v1/communities`);
    const communities = communitiesResponse.data.data || [];
    const community = communities.find((c) => c.id === communityId);

    if (!community) {
      return res.status(404).json({ success: false, error: 'Community not found' });
    }

    // Check OAuth token status for each platform
    const checkPlatformConnection = async (platform) => {
      try {
        const response = await axios.get(
          `${OMNISTREAM_API_URL}/api/v1/auth/${platform}/status?communityId=${community.id}`
        );
        return response.data.connected || false;
      } catch (error) {
        // If endpoint doesn't exist or returns error, assume not connected
        return false;
      }
    };

    const [youtubeConnected, facebookConnected, tiktokConnected] = await Promise.all([
      checkPlatformConnection('youtube'),
      checkPlatformConnection('facebook'),
      checkPlatformConnection('tiktok'),
    ]);

    // Return platform info with OAuth URLs and connection status
    const platforms = [
      {
        name: 'youtube',
        displayName: 'YouTube',
        connected: youtubeConnected,
        authUrl: `${OMNISTREAM_API_URL}/api/v1/auth/youtube/callback?communityId=${community.id}`,
      },
      {
        name: 'facebook',
        displayName: 'Facebook',
        connected: facebookConnected,
        authUrl: `${OMNISTREAM_API_URL}/api/v1/auth/facebook/callback?communityId=${community.id}`,
      },
      {
        name: 'tiktok',
        displayName: 'TikTok',
        connected: tiktokConnected,
        authUrl: `${OMNISTREAM_API_URL}/api/v1/auth/tiktok/callback?communityId=${community.id}`,
      },
    ];

    res.json({ success: true, platforms });
  } catch (error) {
    res
      .status(error.response?.status || 500)
      .json(error.response?.data || { error: 'Failed to fetch platforms', success: false });
  }
});

// Get OAuth authorization URL
app.get('/api/auth/:platform/authorize', async (req, res) => {
  try {
    const communityId = req.query.communityId;
    if (!communityId) {
      return res.status(400).json({ success: false, error: 'Community ID required' });
    }

    const response = await axios.get(
      `${OMNISTREAM_API_URL}/api/v1/auth/${req.params.platform}/authorize`,
      {
        params: { communityId },
      }
    );
    res.json(response.data);
  } catch (error) {
    res
      .status(error.response?.status || 500)
      .json(error.response?.data || { error: 'Failed to get auth URL', success: false });
  }
});

// Get OAuth status for a platform
app.get('/api/auth/:platform/status', async (req, res) => {
  try {
    const communityId = req.query.communityId;
    if (!communityId) {
      return res.status(400).json({ success: false, error: 'Community ID required' });
    }

    const response = await axios.get(
      `${OMNISTREAM_API_URL}/api/v1/auth/${req.params.platform}/status`,
      {
        params: { communityId },
      }
    );
    res.json(response.data);
  } catch (error) {
    res
      .status(error.response?.status || 500)
      .json(error.response?.data || { error: 'Failed to get auth status', success: false });
  }
});

// Revoke/disconnect OAuth tokens for a platform
app.delete('/api/auth/:platform', async (req, res) => {
  try {
    const communityId = req.query.communityId;
    if (!communityId) {
      return res.status(400).json({ success: false, error: 'Community ID required' });
    }

    const response = await axios.delete(
      `${OMNISTREAM_API_URL}/api/v1/auth/${req.params.platform}`,
      {
        params: { communityId },
      }
    );
    res.json(response.data);
  } catch (error) {
    res
      .status(error.response?.status || 500)
      .json(error.response?.data || { error: 'Failed to disconnect platform', success: false });
  }
});

app.post('/api/streams', async (req, res) => {
  try {
    const response = await axios.post(`${OMNISTREAM_API_URL}/api/v1/streams`, req.body);
    res.json(response.data);
  } catch (error) {
    res
      .status(error.response?.status || 500)
      .json(error.response?.data || { error: 'Failed to create stream' });
  }
});

app.get('/api/streams', async (req, res) => {
  try {
    const response = await axios.get(`${OMNISTREAM_API_URL}/api/v1/streams`, {
      params: { communityId: req.query.communityId },
    });
    res.json(response.data);
  } catch (error) {
    res
      .status(error.response?.status || 500)
      .json(error.response?.data || { error: 'Failed to fetch streams' });
  }
});

app.get('/api/streams/community/:communityId', async (req, res) => {
  try {
    const response = await axios.get(
      `${OMNISTREAM_API_URL}/api/v1/streams/community/${req.params.communityId}`
    );
    res.json(response.data);
  } catch (error) {
    res
      .status(error.response?.status || 500)
      .json(error.response?.data || { error: 'Failed to fetch streams' });
  }
});

app.get('/api/streams/:streamId', async (req, res) => {
  try {
    const response = await axios.get(
      `${OMNISTREAM_API_URL}/api/v1/streams/${req.params.streamId}`,
      {
        params: { communityId: req.query.communityId },
      }
    );
    res.json(response.data);
  } catch (error) {
    res
      .status(error.response?.status || 500)
      .json(error.response?.data || { error: 'Failed to fetch stream' });
  }
});

app.get('/api/streams/:streamId/status', async (req, res) => {
  try {
    const response = await axios.get(
      `${OMNISTREAM_API_URL}/api/v1/streams/${req.params.streamId}/status`,
      {
        params: { communityId: req.query.communityId },
      }
    );
    res.json(response.data);
  } catch (error) {
    res
      .status(error.response?.status || 500)
      .json(error.response?.data || { error: 'Failed to fetch stream status' });
  }
});

app.post('/api/streams/:streamId/start', async (req, res) => {
  try {
    const response = await axios.post(
      `${OMNISTREAM_API_URL}/api/v1/streams/${req.params.streamId}/start`,
      req.body
    );
    res.json(response.data);
  } catch (error) {
    res
      .status(error.response?.status || 500)
      .json(error.response?.data || { error: 'Failed to start stream' });
  }
});

app.post('/api/streams/:streamId/stop', async (req, res) => {
  try {
    const response = await axios.post(
      `${OMNISTREAM_API_URL}/api/v1/streams/${req.params.streamId}/stop`,
      req.body
    );
    res.json(response.data);
  } catch (error) {
    res
      .status(error.response?.status || 500)
      .json(error.response?.data || { error: 'Failed to stop stream' });
  }
});

app.delete('/api/streams/:streamId', async (req, res) => {
  try {
    const response = await axios.delete(
      `${OMNISTREAM_API_URL}/api/v1/streams/${req.params.streamId}`,
      {
        params: { communityId: req.query.communityId },
      }
    );
    res.json(response.data);
  } catch (error) {
    res
      .status(error.response?.status || 500)
      .json(error.response?.data || { error: 'Failed to delete stream' });
  }
});

// OAuth callback handler
app.get('/oauth/callback', (req, res) => {
  const { platform, code, state } = req.query;
  res.render('oauth-callback', { platform, code, state });
});

// Debug page
app.get('/debug', (req, res) => {
  res.render('debug');
});

app.listen(PORT, () => {
  console.log(`🌐 Omnistream Web Dashboard running at http://localhost:${PORT}`);
  console.log(`📡 Connected to Omnistream API at ${OMNISTREAM_API_URL}`);
  console.log(`🔍 Debug page: http://localhost:${PORT}/debug`);
});
