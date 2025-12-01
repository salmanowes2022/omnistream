// Global state
let communityData = null;
let communityId = localStorage.getItem('omnistream_community_id');
let platforms = [];
let streams = [];
let streamRefreshInterval = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    if (communityId) {
        loadCommunityProfile();
    }

    // Listen for OAuth callback messages
    window.addEventListener('message', (event) => {
        if (event.data.type === 'oauth-success') {
            showStatus('platform-status', `Successfully connected to ${event.data.platform}!`, 'success');
            loadPlatforms();
        }
    });
});

// Community creation (registration)
async function createCommunity() {
    const communityName = document.getElementById('community-name').value.trim();

    if (!communityName) {
        showStatus('auth-status', 'Please enter a community name', 'error');
        return;
    }

    try {
        const response = await fetch('/api/communities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: communityName })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Failed to create community');
        }

        // Save community ID
        communityId = data.data.id;
        localStorage.setItem('omnistream_community_id', communityId);

        showStatus('auth-status', `Community "${communityName}" created successfully!`, 'success');

        // Clear form
        document.getElementById('community-name').value = '';

        // Load community profile
        setTimeout(() => {
            loadCommunityProfile();
        }, 500);
    } catch (error) {
        showStatus('auth-status', error.message, 'error');
    }
}

// Login with existing community ID
async function loginWithCommunityId() {
    const inputCommunityId = document.getElementById('login-communityid').value.trim();

    if (!inputCommunityId) {
        showStatus('auth-status', 'Please enter your community ID', 'error');
        return;
    }

    try {
        // Verify community exists
        const response = await fetch(`/api/community/${inputCommunityId}`);

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Invalid community ID');
        }

        // Save community ID
        communityId = inputCommunityId;
        localStorage.setItem('omnistream_community_id', communityId);

        showStatus('auth-status', 'Login successful!', 'success');

        // Clear form
        document.getElementById('login-communityid').value = '';

        setTimeout(() => {
            loadCommunityProfile();
        }, 500);
    } catch (error) {
        showStatus('auth-status', error.message, 'error');
    }
}

function logout() {
    communityData = null;
    communityId = null;
    platforms = [];
    streams = [];
    localStorage.removeItem('omnistream_community_id');

    if (streamRefreshInterval) {
        clearInterval(streamRefreshInterval);
        streamRefreshInterval = null;
    }

    document.getElementById('auth-section').style.display = 'block';
    document.getElementById('profile-section').style.display = 'none';
    document.getElementById('platforms-section').style.display = 'none';
    document.getElementById('streams-section').style.display = 'none';

    showStatus('auth-status', 'Logged out successfully', 'info');
}

async function loadCommunityProfile() {
    try {
        const response = await fetch(`/api/community/${communityId}`);

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Failed to load community');
        }

        communityData = data.data;

        document.getElementById('profile-name').textContent = data.data.name;
        document.getElementById('profile-id').textContent = data.data.id;

        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('profile-section').style.display = 'block';
        document.getElementById('platforms-section').style.display = 'block';
        document.getElementById('streams-section').style.display = 'block';

        loadPlatforms();
        loadStreams();

        // Auto-refresh streams every 5 seconds
        if (!streamRefreshInterval) {
            streamRefreshInterval = setInterval(loadStreams, 5000);
        }
    } catch (error) {
        showStatus('auth-status', error.message, 'error');
        logout();
    }
}

// Platform OAuth functions
async function loadPlatforms() {
    try {
        const response = await fetch(`/api/platforms?communityId=${communityId}`);

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to load platforms');
        }

        platforms = data.platforms;
        renderPlatforms();
        renderPlatformCheckboxes();
    } catch (error) {
        showStatus('platform-status', error.message, 'error');
    }
}

function renderPlatforms() {
    const container = document.getElementById('platforms-grid');

    const platformIcons = {
        youtube: '📺',
        facebook: '👥',
        tiktok: '🎵',
        twitch: '🎮'
    };

    container.innerHTML = platforms.map(platform => {
        const isConnected = platform.connected;
        const icon = platformIcons[platform.name.toLowerCase()] || '📡';

        return `
            <div class="platform-card ${isConnected ? 'connected' : ''}">
                <div class="platform-icon">${icon}</div>
                <div class="platform-name">${platform.name}</div>
                <div class="platform-status ${isConnected ? 'connected' : ''}">
                    ${isConnected ? '✓ Connected' : 'Not Connected'}
                </div>
                ${!isConnected ? `
                    <button onclick="connectPlatform('${platform.name}')" class="btn btn-primary">
                        Connect ${platform.name}
                    </button>
                ` : `
                    <button onclick="disconnectPlatform('${platform.name}')" class="btn btn-secondary">
                        Disconnect
                    </button>
                `}
            </div>
        `;
    }).join('');
}

function renderPlatformCheckboxes() {
    const container = document.getElementById('platform-checkboxes');
    const connectedPlatforms = platforms.filter(p => p.connected);

    if (connectedPlatforms.length === 0) {
        container.innerHTML = '<p class="info-text">Please connect at least one platform above to create streams.</p>';
        return;
    }

    container.innerHTML = connectedPlatforms.map(platform => `
        <label class="platform-checkbox">
            <input type="checkbox" name="platforms" value="${platform.name}" />
            <span>${platform.name}</span>
        </label>
    `).join('');
}

async function connectPlatform(platformName) {
    try {
        // Get the OAuth authorization URL
        const response = await fetch(`/api/auth/${platformName}/authorize?communityId=${communityId}`);

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Failed to get authorization URL');
        }

        // Open OAuth URL in popup
        const width = 600;
        const height = 700;
        const left = (screen.width / 2) - (width / 2);
        const top = (screen.height / 2) - (height / 2);

        window.open(
            data.data.authUrl,
            `${platformName}_oauth`,
            `width=${width},height=${height},left=${left},top=${top}`
        );

        showStatus('platform-status', `Opening ${platformName} authentication window...`, 'info');
    } catch (error) {
        showStatus('platform-status', error.message, 'error');
    }
}

function disconnectPlatform(platformName) {
    // Note: Actual disconnect would need an API endpoint
    showStatus('platform-status', `Disconnect functionality would be implemented via API`, 'info');
}

// Stream management functions
async function loadStreams() {
    try {
        const response = await fetch(`/api/streams?communityId=${communityId}`);

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Failed to load streams');
        }

        streams = data.data || [];
        renderStreams();
    } catch (error) {
        // Only show error if it's not a background refresh
        if (!streamRefreshInterval) {
            showStatus('stream-status', error.message, 'error');
        }
    }
}

function renderStreams() {
    const container = document.getElementById('streams-container');

    if (streams.length === 0) {
        container.innerHTML = '<p class="info-text">No streams yet. Create your first stream above!</p>';
        return;
    }

    container.innerHTML = streams.map(stream => {
        const isActive = stream.status === 'active';
        const platformTags = (stream.platforms || []).map(p =>
            `<span class="stream-platform-tag">${p}</span>`
        ).join('');

        return `
            <div class="stream-card ${isActive ? 'active' : ''}">
                <div class="stream-header">
                    <div class="stream-title">${escapeHtml(stream.title)}</div>
                    <span class="stream-badge ${isActive ? 'active' : 'idle'}">
                        ${isActive ? '🔴 LIVE' : '⚫ Idle'}
                    </span>
                </div>

                ${stream.description ? `
                    <div class="stream-description">${escapeHtml(stream.description)}</div>
                ` : ''}

                <div class="stream-platforms">${platformTags}</div>

                ${stream.rtmpUrl || stream.ingestUrl ? `
                    <div class="stream-ingest">
                        <h4>RTMP Ingest URL:</h4>
                        <code>${escapeHtml(stream.rtmpUrl || stream.ingestUrl)}</code>
                        ${stream.rtmpKey || stream.streamKey ? `
                            <h4 style="margin-top: 10px;">Stream Key:</h4>
                            <code>${escapeHtml(stream.rtmpKey || stream.streamKey)}</code>
                        ` : ''}
                    </div>
                ` : ''}

                <div class="stream-actions">
                    ${!isActive ? `
                        <button onclick="startStream('${stream.id}')" class="btn btn-success">
                            ▶ Start Stream
                        </button>
                    ` : `
                        <button onclick="stopStream('${stream.id}')" class="btn btn-danger">
                            ⏹ Stop Stream
                        </button>
                    `}
                    <button onclick="refreshStream('${stream.id}')" class="btn btn-secondary">
                        🔄 Refresh
                    </button>
                    <button onclick="deleteStream('${stream.id}')" class="btn btn-danger">
                        🗑 Delete
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

async function createStream() {
    const title = document.getElementById('stream-title').value.trim();
    const description = document.getElementById('stream-description').value.trim();
    const selectedPlatforms = Array.from(document.querySelectorAll('input[name="platforms"]:checked'))
        .map(cb => cb.value);

    if (!title) {
        showStatus('stream-status', 'Please enter a stream title', 'error');
        return;
    }

    if (selectedPlatforms.length === 0) {
        showStatus('stream-status', 'Please select at least one platform', 'error');
        return;
    }

    try {
        const response = await fetch('/api/streams', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                communityId,
                title,
                description,
                platforms: selectedPlatforms,
                rtmpUrl: 'rtmp://demo.omnistream.com/live',
                rtmpKey: `stream_${Date.now()}`
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Failed to create stream');
        }

        showStatus('stream-status', 'Stream created successfully!', 'success');

        // Clear form
        document.getElementById('stream-title').value = '';
        document.getElementById('stream-description').value = '';
        document.querySelectorAll('input[name="platforms"]').forEach(cb => cb.checked = false);

        // Reload streams
        loadStreams();
    } catch (error) {
        showStatus('stream-status', error.message, 'error');
    }
}

async function startStream(streamId) {
    try {
        const response = await fetch(`/api/streams/${streamId}/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ communityId })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to start stream');
        }

        showStatus('stream-status', 'Stream started successfully!', 'success');
        loadStreams();
    } catch (error) {
        showStatus('stream-status', error.message, 'error');
    }
}

async function stopStream(streamId) {
    try {
        const response = await fetch(`/api/streams/${streamId}/stop`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ communityId })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to stop stream');
        }

        showStatus('stream-status', 'Stream stopped successfully!', 'success');
        loadStreams();
    } catch (error) {
        showStatus('stream-status', error.message, 'error');
    }
}

async function refreshStream(streamId) {
    try {
        const response = await fetch(`/api/streams/${streamId}?communityId=${communityId}`);

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to refresh stream');
        }

        showStatus('stream-status', 'Stream refreshed!', 'success');
        loadStreams();
    } catch (error) {
        showStatus('stream-status', error.message, 'error');
    }
}

async function deleteStream(streamId) {
    if (!confirm('Are you sure you want to delete this stream?')) {
        return;
    }

    try {
        const response = await fetch(`/api/streams/${streamId}?communityId=${communityId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to delete stream');
        }

        showStatus('stream-status', 'Stream deleted successfully!', 'success');
        loadStreams();
    } catch (error) {
        showStatus('stream-status', error.message, 'error');
    }
}

// Utility functions
function showStatus(elementId, message, type) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.className = `status-message ${type}`;

    // Auto-hide after 5 seconds for success/info messages
    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
