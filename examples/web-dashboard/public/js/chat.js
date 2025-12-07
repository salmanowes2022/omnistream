/**
 * Omnistream Live Chat Client
 * WebSocket-based real-time chat interface
 */

let ws = null;
let chatMessages = [];
let platformFilters = {
  youtube: true,
  telegram: true,
  facebook: true,
  twitter: true,
  instagram: true,
  tiktok: true,
};
let platformStats = {
  youtube: 0,
  telegram: 0,
  facebook: 0,
  twitter: 0,
  instagram: 0,
  tiktok: 0,
};
let sendPlatforms = [];

/**
 * Initialize inputs from query params or localStorage
 */
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const communityInput = document.getElementById('community-id');
  const streamInput = document.getElementById('stream-id');

  const storedCommunity =
    params.get('communityId') || localStorage.getItem('omnistream_community_id');
  const storedStream = params.get('streamId') || localStorage.getItem('omnistream_stream_id');

  if (communityInput && storedCommunity) communityInput.value = storedCommunity;
  if (streamInput && storedStream) streamInput.value = storedStream;

  // Auto-connect if both are present
  if (storedCommunity && storedStream) {
    connectToChat();
  }
});

/**
 * Connect to the chat WebSocket server
 */
function connectToChat() {
  const communityId = document.getElementById('community-id').value.trim();
  const streamId = document.getElementById('stream-id').value.trim();

  if (!communityId || !streamId) {
    showStatus('error', 'Please enter both Community ID and Stream ID');
    return;
  }

  // Save to localStorage for convenience
  localStorage.setItem('omnistream_community_id', communityId);
  localStorage.setItem('omnistream_stream_id', streamId);

  showStatus('info', 'Connecting to chat server...');

  // Load stream platforms to populate send selector (non-blocking)
  loadStreamPlatforms(communityId, streamId);

  // Connect to WebSocket (assuming backend is on same host)
  const wsUrl = 'ws://localhost:3000/ws/chat';
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    showStatus('success', 'Connected! Subscribing to stream...');

    // Subscribe to the stream
    ws.send(
      JSON.stringify({
        type: 'subscribe',
        streamId: streamId,
        communityId: communityId,
      })
    );
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    switch (data.type) {
      case 'connected':
        showStatus('info', data.message);
        break;

      case 'subscribed':
        showStatus('success', `Subscribed to stream: ${data.streamId}`);
        showChatSection();
        updateConnectionIndicator(true);
        break;

      case 'message':
        handleChatMessage(data.message);
        break;

      case 'messageHighlighted':
        handleMessageHighlight(data.messageId);
        break;

      case 'messageSent':
        showStatus('success', 'Message sent!');
        break;

      case 'error':
        // Handle rate limit errors specially
        if (data.rateLimitExceeded) {
          const seconds = Math.ceil(data.resetIn / 1000);
          showStatus('error', `${data.error} (wait ${seconds}s)`);
        } else {
          showStatus('error', data.error);
        }
        break;

      default:
        break;
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    showStatus('error', 'Connection error. Please check if the server is running.');
    updateConnectionIndicator(false);
  };

  ws.onclose = () => {
    showStatus('warning', 'Disconnected from chat server');
    updateConnectionIndicator(false);
    ws = null;
  };
}

/**
 * Disconnect from chat
 */
function disconnectFromChat() {
  if (ws) {
    ws.send(JSON.stringify({ type: 'unsubscribe' }));
    ws.close();
    ws = null;
  }

  hideChatSection();
  showStatus('info', 'Disconnected from chat');
  updateConnectionIndicator(false);
}

/**
 * Handle incoming chat message
 */
function handleChatMessage(message) {
  chatMessages.push(message);
  platformStats[message.platform] = (platformStats[message.platform] || 0) + 1;

  // Ensure filters know about new platforms dynamically
  if (!(message.platform in platformFilters)) {
    platformFilters[message.platform] = true;
  }

  addMessageToUI(message);
  updateStats();
}

/**
 * Add message to the UI
 */
function addMessageToUI(message) {
  const messagesContainer = document.getElementById('chat-messages');

  // Remove empty state if present
  const emptyState = messagesContainer.querySelector('.empty-state');
  if (emptyState) {
    emptyState.remove();
  }

  // Check if message should be shown based on filters
  if (!platformFilters[message.platform]) {
    return;
  }

  const messageEl = document.createElement('div');
  messageEl.className = `chat-message platform-${message.platform}`;
  messageEl.setAttribute('data-message-id', message.id);
  messageEl.setAttribute('data-platform', message.platform);

  const timestamp = new Date(message.timestamp).toLocaleTimeString();

  messageEl.innerHTML = `
    <div class="message-header">
      <span class="platform-badge ${message.platform}">${message.platform.toUpperCase()}</span>
      <span class="message-time">${timestamp}</span>
    </div>
    <div class="message-author">
      ${message.authorImageUrl ? `<img src="${message.authorImageUrl}" alt="${message.authorName}" class="author-avatar">` : ''}
      <span class="author-name">${escapeHtml(message.authorName)}</span>
    </div>
    <div class="message-text">${escapeHtml(message.message)}</div>
    <div class="message-actions">
      <button onclick="highlightMessage('${message.id}', '${message.platform}')" class="btn-icon" title="Highlight">⭐</button>
    </div>
  `;

  messagesContainer.appendChild(messageEl);

  // Auto-scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * Highlight a message
 */
function highlightMessage(messageId, platform) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    alert('Not connected to chat server');
    return;
  }

  ws.send(
    JSON.stringify({
      type: 'highlight',
      messageId: messageId,
      platform: platform,
    })
  );
}

/**
 * Handle message highlight response
 */
function handleMessageHighlight(messageId) {
  const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
  if (messageEl) {
    messageEl.classList.add('highlighted');
    showStatus('success', 'Message highlighted!');
  }
}

/**
 * Send a message (Telegram only)
 */
function sendMessage() {
  const input = document.getElementById('message-input');
  const platformSelect = document.getElementById('send-platform');
  const text = input.value.trim();

  if (!text) {
    return;
  }

  const platform = platformSelect ? platformSelect.value : '';
  if (!platform) {
    showStatus('error', 'Select a platform to send your message.');
    return;
  }

  if (!ws || ws.readyState !== WebSocket.OPEN) {
    alert('Not connected to chat server');
    return;
  }

  ws.send(
    JSON.stringify({
      type: 'sendMessage',
      text,
      platform,
      communityId: document.getElementById('community-id').value.trim(),
      streamId: document.getElementById('stream-id').value.trim(),
    })
  );

  input.value = '';
}

/**
 * Handle Enter key in message input
 */
function handleMessageKeypress(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
}

/**
 * Populate send platform selector
 */
function renderSendPlatforms(platforms) {
  const select = document.getElementById('send-platform');
  if (!select) return;

  if (!platforms || platforms.length === 0) {
    select.innerHTML = '<option value=\"\">No platforms available</option>';
    return;
  }

  const options = ['<option value=\"\">Select platform</option>']
    .concat(
      platforms.map((p) => {
        const name = p.charAt(0).toUpperCase() + p.slice(1);
        return `<option value=\"${p}\">${name}</option>`;
      })
    )
    .join('');

  select.innerHTML = options;
}

/**
 * Load stream platforms for send dropdown
 */
async function loadStreamPlatforms(communityId, streamId) {
  try {
    const res = await fetch(`/api/streams/${streamId}?communityId=${communityId}`);
    const data = await res.json();

    if (!data.success) {
      return;
    }

    const stream = data.data?.stream || data.data;
    const platformStreams = data.data?.platformStreams || [];
    const platforms = new Set();
    (stream?.platforms || []).forEach((p) => platforms.add(p));
    platformStreams.forEach((ps) => platforms.add(ps.platform));

    sendPlatforms = Array.from(platforms);
    renderSendPlatforms(sendPlatforms);
  } catch (error) {
    console.error('Failed to load stream platforms', error);
  }
}

/**
 * Toggle platform filter
 */
function togglePlatformFilter(platform) {
  platformFilters[platform] = !platformFilters[platform];
  filterMessages();
}

/**
 * Filter messages based on platform selection
 */
function filterMessages() {
  const messages = document.querySelectorAll('.chat-message');
  messages.forEach((msg) => {
    const platform = msg.getAttribute('data-platform');
    if (platformFilters[platform]) {
      msg.style.display = 'block';
    } else {
      msg.style.display = 'none';
    }
  });
}

/**
 * Clear all messages
 */
function clearChat() {
  if (confirm('Are you sure you want to clear all messages?')) {
    chatMessages = [];
    platformStats = {
      youtube: 0,
      telegram: 0,
      facebook: 0,
      twitter: 0,
      instagram: 0,
      tiktok: 0,
    };

    const messagesContainer = document.getElementById('chat-messages');
    messagesContainer.innerHTML = `
      <div class="empty-state">
        <p>Chat cleared</p>
        <p class="info-text">New messages will appear here</p>
      </div>
    `;

    updateStats();
  }
}

/**
 * Export chat to JSON
 */
function exportChat() {
  if (chatMessages.length === 0) {
    alert('No messages to export');
    return;
  }

  const dataStr = JSON.stringify(chatMessages, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `chat-export-${new Date().toISOString()}.json`;
  a.click();

  URL.revokeObjectURL(url);
  showStatus('success', 'Chat exported successfully!');
}

/**
 * Update statistics display
 */
function updateStats() {
  // Update total count
  const totalMessages = chatMessages.length;
  document.getElementById('message-count').textContent =
    `${totalMessages} message${totalMessages !== 1 ? 's' : ''}`;

  // Update platform stats
  Object.keys(platformStats).forEach((platform) => {
    const statEl = document.getElementById(`stat-${platform}`);
    if (statEl) {
      statEl.textContent = platformStats[platform];
    }
  });
}

/**
 * Show/hide chat section
 */
function showChatSection() {
  document.getElementById('chat-section').style.display = 'block';
  document.getElementById('connect-btn').style.display = 'none';
  document.getElementById('disconnect-btn').style.display = 'inline-block';
}

function hideChatSection() {
  document.getElementById('chat-section').style.display = 'none';
  document.getElementById('connect-btn').style.display = 'inline-block';
  document.getElementById('disconnect-btn').style.display = 'none';
}

/**
 * Update connection indicator
 */
function updateConnectionIndicator(connected) {
  const indicator = document.getElementById('connection-indicator');
  if (connected) {
    indicator.className = 'status-dot connected';
    indicator.title = 'Connected';
  } else {
    indicator.className = 'status-dot disconnected';
    indicator.title = 'Disconnected';
  }
}

/**
 * Show status message
 */
function showStatus(type, message) {
  const statusEl = document.getElementById('connection-status');
  statusEl.className = `status-message ${type}`;
  statusEl.textContent = message;
  statusEl.style.display = 'block';

  // Auto-hide success messages after 3 seconds
  if (type === 'success') {
    setTimeout(() => {
      statusEl.style.display = 'none';
    }, 3000);
  }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize indicator on load (values handled by the first DOMContentLoaded listener)
document.addEventListener('DOMContentLoaded', () => {
  updateConnectionIndicator(false);
});
