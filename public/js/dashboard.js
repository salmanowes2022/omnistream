/**
 * Omnistream Dashboard - Main Application Logic
 */

class OmnistreamDashboard {
  constructor() {
    this.api = new OmnistreamAPI();
    this.ws = new OmnistreamWebSocket();
    this.communityId = null;
    this.streams = [];
    this.pollInterval = null;

    this.init();
  }

  /**
   * Initialize dashboard
   */
  async init() {
    console.log('Initializing Omnistream Dashboard...');

    // Check API connection
    await this.checkConnection();

    // Check if user is logged in (NEW user auth system)
    const authToken = localStorage.getItem('authToken');
    if (authToken) {
      console.log('User authenticated with token');
      await this.loadDashboard();
    } else {
      // Fall back to old community system
      const apiKey = this.api.getApiKey();
      if (apiKey) {
        await this.loadDashboard();
      } else {
        this.showSetup();
      }
    }

    // Setup event listeners
    this.setupEventListeners();

    // Setup WebSocket handlers
    this.setupWebSocket();

    // Start periodic stream status polling
    this.startStreamPolling();
  }

  /**
   * Check API connection
   */
  async checkConnection() {
    try {
      const health = await this.api.checkHealth();
      if (health.status === 'ok') {
        this.updateConnectionStatus(true);
      }
    } catch (error) {
      this.updateConnectionStatus(false);
      this.showToast('Failed to connect to Omnistream API', 'error');
    }
  }

  /**
   * Update connection status indicator
   */
  updateConnectionStatus(connected) {
    const statusEl = document.getElementById('connectionStatus');
    const textEl = document.getElementById('statusText');

    if (connected) {
      statusEl.classList.remove('disconnected');
      statusEl.classList.add('connected');
      textEl.textContent = 'Connected';
    } else {
      statusEl.classList.remove('connected');
      statusEl.classList.add('disconnected');
      textEl.textContent = 'Disconnected';
    }
  }

  /**
   * Show setup section
   */
  showSetup() {
    document.getElementById('setupSection').classList.remove('hidden');
    document.getElementById('dashboardSection').classList.add('hidden');
  }

  /**
   * Show dashboard
   */
  showDashboard() {
    document.getElementById('setupSection').classList.add('hidden');
    document.getElementById('dashboardSection').classList.remove('hidden');
  }

  /**
   * Load dashboard data
   */
  async loadDashboard() {
    try {
      // Get community info from localStorage
      this.communityId = localStorage.getItem('omnistream_community_id');

      if (!this.communityId) {
        this.showSetup();
        return;
      }

      this.showDashboard();

      // Load data
      await this.loadCommunityInfo();
      await this.loadOAuthStatus();
      await this.loadStreams();
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      this.showToast('Failed to load dashboard data', 'error');
    }
  }

  /**
   * Load community information
   */
  async loadCommunityInfo() {
    document.getElementById('communityId').textContent = this.communityId;
    document.getElementById('apiKey').textContent = this.api.getApiKey();
  }

  /**
   * Load OAuth authorization status
   */
  async loadOAuthStatus() {
    const platforms = ['youtube', 'facebook'];

    for (const platform of platforms) {
      const isAuthorized = await this.api.checkAuthStatus(platform, this.communityId);
      this.updatePlatformStatus(platform, isAuthorized);
    }
  }

  /**
   * Update platform authorization status
   */
  updatePlatformStatus(platform, isAuthorized) {
    const statusEl = document.getElementById(`${platform}-status`);
    const cardEl = document.querySelector(`.platform-card[data-platform="${platform}"]`);

    if (isAuthorized) {
      statusEl.textContent = '✅';
      cardEl.classList.add('authorized');
    } else {
      statusEl.textContent = '❌';
      cardEl.classList.remove('authorized');
    }
  }

  /**
   * Authorize a platform
   */
  async authorizePlatform(platform) {
    try {
      const authData = await this.api.getAuthUrl(platform, this.communityId);

      // Open auth URL in new window
      const width = 600;
      const height = 700;
      const left = (screen.width - width) / 2;
      const top = (screen.height - height) / 2;

      window.open(
        authData.authUrl,
        'oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      this.showToast(`Opening ${platform} authorization...`, 'info');

      // Check for completion after a delay
      setTimeout(async () => {
        this.api.setAuthStatus(platform, true);
        this.updatePlatformStatus(platform, true);
        this.showToast(`${platform} authorized successfully!`, 'success');
      }, 5000);
    } catch (error) {
      console.error(`Failed to authorize ${platform}:`, error);
      this.showToast(`Failed to authorize ${platform}: ${error.message}`, 'error');
    }
  }

  /**
   * Load streams
   */
  async loadStreams() {
    try {
      this.streams = await this.api.listStreams();
      this.renderStreams();
      this.updateChatStreamSelect();
    } catch (error) {
      console.error('Failed to load streams:', error);
      this.showToast('Failed to load streams', 'error');
    }
  }

  /**
   * Render streams list
   */
  renderStreams() {
    const container = document.getElementById('streamList');

    if (!this.streams || this.streams.length === 0) {
      container.innerHTML = '<p class="text-muted">No streams yet. Create one above to get started!</p>';
      return;
    }

    container.innerHTML = this.streams.map(stream => this.renderStreamItem(stream)).join('');
  }

  /**
   * Render a single stream item
   */
  renderStreamItem(stream) {
    const platforms = stream.platforms.map(p =>
      `<span class="platform-badge">${p}</span>`
    ).join('');

    return `
      <div class="stream-item" data-stream-id="${stream.id}">
        <div class="stream-header">
          <div>
            <h3 class="stream-title">${stream.title}</h3>
            <div class="stream-platforms">${platforms}</div>
            ${stream.description ? `<p class="text-muted text-sm">${stream.description}</p>` : ''}
          </div>
          <div>
            <span class="stream-status idle" id="status-${stream.id}">idle</span>
          </div>
        </div>

        <div class="stream-details">
          <p class="text-sm text-muted mb-1">RTMP Configuration:</p>
          <div class="rtmp-credentials">
            <div class="credential-row">
              <span class="credential-label">URL:</span>
              <span class="credential-value">
                <code>${stream.rtmpUrl}</code>
                <button class="btn btn-secondary copy-btn" onclick="dashboard.copyText('${stream.rtmpUrl}')">Copy</button>
              </span>
            </div>
            <div class="credential-row">
              <span class="credential-label">Key:</span>
              <span class="credential-value">
                <code>${stream.rtmpKey}</code>
                <button class="btn btn-secondary copy-btn" onclick="dashboard.copyText('${stream.rtmpKey}')">Copy</button>
              </span>
            </div>
          </div>
        </div>

        <div class="stream-actions">
          <button class="btn btn-success btn-sm" onclick="dashboard.startStream('${stream.id}')">
            Start Stream
          </button>
          <button class="btn btn-secondary btn-sm" onclick="dashboard.stopStream('${stream.id}')">
            Stop Stream
          </button>
          <button class="btn btn-danger btn-sm" onclick="dashboard.deleteStream('${stream.id}')">
            Delete
          </button>
          <button class="btn btn-primary btn-sm" onclick="dashboard.refreshStreamStatus('${stream.id}')">
            Refresh Status
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Update chat stream select dropdown
   */
  updateChatStreamSelect() {
    const select = document.getElementById('chatStreamSelect');

    if (!this.streams || this.streams.length === 0) {
      select.innerHTML = '<option value="">-- No streams available --</option>';
      return;
    }

    select.innerHTML = '<option value="">-- Select a stream --</option>' +
      this.streams.map(stream =>
        `<option value="${stream.id}">${stream.title}</option>`
      ).join('');
  }

  /**
   * Start a stream
   */
  async startStream(streamId) {
    try {
      this.showToast('Starting stream...', 'info');
      const result = await this.api.startStream(streamId);

      // Update status
      await this.refreshStreamStatus(streamId);

      this.showToast('Stream start requested', 'success');
    } catch (error) {
      console.error('Failed to start stream:', error);
      this.showToast(`Failed to start stream: ${error.message}`, 'error');
    }
  }

  /**
   * Stop a stream
   */
  async stopStream(streamId) {
    try {
      this.showToast('Stopping stream...', 'info');
      await this.api.stopStream(streamId);

      // Update status
      await this.refreshStreamStatus(streamId);

      this.showToast('Stream stopped', 'success');
    } catch (error) {
      console.error('Failed to stop stream:', error);
      this.showToast(`Failed to stop stream: ${error.message}`, 'error');
    }
  }

  /**
   * Delete a stream
   */
  async deleteStream(streamId) {
    if (!confirm('Are you sure you want to delete this stream?')) {
      return;
    }

    try {
      await this.api.deleteStream(streamId);
      await this.loadStreams();
      this.showToast('Stream deleted successfully', 'success');
    } catch (error) {
      console.error('Failed to delete stream:', error);
      this.showToast(`Failed to delete stream: ${error.message}`, 'error');
    }
  }

  /**
   * Refresh stream status
   */
  async refreshStreamStatus(streamId) {
    try {
      const result = await this.api.getStreamStatus(streamId);
      const statusEl = document.getElementById(`status-${streamId}`);

      if (statusEl && result.platformStreams && result.platformStreams.length > 0) {
        const firstPlatform = result.platformStreams[0];
        statusEl.textContent = firstPlatform.status;
        statusEl.className = `stream-status ${firstPlatform.status}`;
      }
    } catch (error) {
      console.error('Failed to refresh stream status:', error);
    }
  }

  /**
   * Start polling stream statuses
   */
  startStreamPolling() {
    // Poll every 10 seconds
    this.pollInterval = setInterval(async () => {
      if (this.streams && this.streams.length > 0) {
        for (const stream of this.streams) {
          await this.refreshStreamStatus(stream.id);
        }
      }
    }, 10000);
  }

  /**
   * Setup WebSocket
   */
  setupWebSocket() {
    this.ws.onConnect = () => {
      this.updateWebSocketStatus(true);
    };

    this.ws.onDisconnect = () => {
      this.updateWebSocketStatus(false);
    };

    this.ws.onMessage = (message) => {
      this.addChatMessage(message);
    };

    this.ws.onError = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  /**
   * Update WebSocket status
   */
  updateWebSocketStatus(connected) {
    const statusEl = document.getElementById('wsStatus');
    const textEl = document.getElementById('wsStatusText');

    if (connected) {
      statusEl.classList.remove('disconnected');
      statusEl.classList.add('connected');
      textEl.textContent = 'Connected';
    } else {
      statusEl.classList.remove('connected');
      statusEl.classList.add('disconnected');
      textEl.textContent = 'Disconnected';
    }
  }

  /**
   * Connect to stream chat
   */
  connectToChat(streamId) {
    if (!streamId) {
      return;
    }

    // Connect WebSocket if not already connected
    if (!this.ws.isConnected()) {
      this.ws.connect();
    }

    // Subscribe to stream
    setTimeout(() => {
      const apiKey = this.api.getApiKey();
      this.ws.subscribe(streamId, apiKey);
      this.showToast('Connected to stream chat', 'success');

      // Clear messages
      const container = document.getElementById('chatMessages');
      container.innerHTML = '<p class="text-muted">Waiting for messages...</p>';
    }, 1000);
  }

  /**
   * Add chat message to display
   */
  addChatMessage(message) {
    const container = document.getElementById('chatMessages');

    // Remove placeholder text
    if (container.querySelector('.text-muted')) {
      container.innerHTML = '';
    }

    const messageEl = document.createElement('div');
    messageEl.className = `chat-message ${message.platform}`;
    messageEl.innerHTML = `
      <div class="message-header">
        <div class="flex items-center gap-1">
          <span class="message-author">${message.authorName}</span>
          <span class="message-platform">${message.platform}</span>
        </div>
        <span class="message-time">${new Date(message.timestamp).toLocaleTimeString()}</span>
      </div>
      <div class="message-text">${message.message}</div>
    `;

    container.appendChild(messageEl);

    // Auto-scroll to bottom
    container.scrollTop = container.scrollHeight;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Create community form
    document.getElementById('createCommunityForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.createCommunity();
    });

    // Create stream form
    document.getElementById('createStreamForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.createStream();
    });

    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.switchTab(tab.dataset.tab);
      });
    });

    // Chat stream selector
    document.getElementById('chatStreamSelect').addEventListener('change', (e) => {
      this.connectToChat(e.target.value);
    });
  }

  /**
   * Create community
   */
  async createCommunity() {
    const nameInput = document.getElementById('communityName');
    const name = nameInput.value.trim();

    if (!name) {
      this.showToast('Community name is required', 'error');
      return;
    }

    try {
      const community = await this.api.createCommunity(name);

      this.communityId = community.id;
      localStorage.setItem('omnistream_community_id', community.id);

      this.showToast('Community created successfully!', 'success');

      // Load dashboard
      await this.loadDashboard();
    } catch (error) {
      console.error('Failed to create community:', error);
      this.showToast(`Failed to create community: ${error.message}`, 'error');
    }
  }

  /**
   * Create stream
   */
  async createStream() {
    const title = document.getElementById('streamTitle').value.trim();
    const description = document.getElementById('streamDescription').value.trim();
    const rtmpUrl = document.getElementById('rtmpUrl').value.trim();
    const rtmpKey = document.getElementById('rtmpKey').value.trim();
    const scheduledTime = document.getElementById('scheduledTime').value;

    // Get selected platforms
    const platforms = [];
    if (document.getElementById('platform-youtube').checked) platforms.push('youtube');
    if (document.getElementById('platform-facebook').checked) platforms.push('facebook');

    if (!title || !rtmpUrl || !rtmpKey) {
      this.showToast('Please fill in all required fields', 'error');
      return;
    }

    if (platforms.length === 0) {
      this.showToast('Please select at least one platform', 'error');
      return;
    }

    try {
      const streamData = {
        title,
        description,
        rtmpUrl,
        rtmpKey,
        platforms,
      };

      if (scheduledTime) {
        streamData.scheduledStartTime = new Date(scheduledTime).toISOString();
      }

      await this.api.createStream(streamData);

      this.showToast('Stream created successfully!', 'success');

      // Reset form
      document.getElementById('createStreamForm').reset();
      document.getElementById('rtmpUrl').value = 'rtmp://localhost/live';

      // Reload streams
      await this.loadStreams();
    } catch (error) {
      console.error('Failed to create stream:', error);
      this.showToast(`Failed to create stream: ${error.message}`, 'error');
    }
  }

  /**
   * Switch tabs
   */
  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
  }

  /**
   * Copy text to clipboard
   */
  async copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.showToast('Copied to clipboard!', 'success');
    } catch (error) {
      console.error('Failed to copy:', error);
      this.showToast('Failed to copy to clipboard', 'error');
    }
  }

  /**
   * Copy element content to clipboard
   */
  async copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    const text = element.textContent;
    await this.copyText(text);
  }

  /**
   * Reset dashboard (clear all data)
   */
  resetDashboard() {
    if (!confirm('Are you sure? This will clear all your settings and you will need to set up again.')) {
      return;
    }

    localStorage.clear();
    this.api.clearApiKey();
    this.ws.disconnect();

    this.showToast('Dashboard reset. Refreshing...', 'info');

    setTimeout(() => {
      location.reload();
    }, 1500);
  }

  /**
   * Show toast notification
   */
  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<div class="toast-message">${message}</div>`;

    container.appendChild(toast);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => {
        container.removeChild(toast);
      }, 300);
    }, 5000);
  }
}

// Initialize dashboard when DOM is ready
let dashboard;

document.addEventListener('DOMContentLoaded', () => {
  dashboard = new OmnistreamDashboard();
});
