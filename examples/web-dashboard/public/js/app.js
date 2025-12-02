// Global state
let communityData = null;
let communityId = null;
let platforms = [];
let streams = [];
let streamRefreshInterval = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    communityId = localStorage.getItem('omnistream_community_id');

    if (communityId) {
        loadCommunityProfile();
    }

    window.addEventListener('message', (event) => {
        if (event.data.type === 'oauth-success') {
            showStatus('platform-status', `Successfully connected to ${event.data.platform}!`, 'success');
            setTimeout(() => {
                loadPlatforms();
            }, 1500);
        }
    });
});

// Tab switching for authentication
function switchAuthTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.auth-tab-content').forEach(content => {
        content.style.display = 'none';
    });

    // Remove active class from all tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab content
    const tabContent = document.getElementById(`${tabName}-form`);
    if (tabContent) {
        tabContent.style.display = 'block';
    }

    // Add active class to selected tab
    const tabBtn = document.getElementById(`tab-${tabName}`);
    if (tabBtn) {
        tabBtn.classList.add('active');
    }

    // Clear any previous status messages
    const statusElement = document.getElementById('auth-status');
    if (statusElement) {
        statusElement.style.display = 'none';
    }
}

// User login with JWT
async function userLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        showStatus('auth-status', 'Please enter both email and password', 'error');
        return;
    }

    try {
        const response = await fetch('/api/v1/user-auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await parseJsonResponse(response, 'User login');

        if (!response.ok || !data.success) {
            throw new Error(data.error?.message || data.error || 'Login failed');
        }

        // Store JWT token
        localStorage.setItem('omnistream_jwt_token', data.data.token);
        localStorage.setItem('omnistream_user_email', data.data.user.email);

        showStatus('auth-status', 'Login successful!', 'success');

        // Clear form
        document.getElementById('login-email').value = '';
        document.getElementById('login-password').value = '';

        // Load user's first community or create one
        setTimeout(async () => {
            await loadUserCommunities();
        }, 500);
    } catch (error) {
        showStatus('auth-status', error.message, 'error');
    }
}

// User registration with JWT
async function userRegister() {
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const passwordConfirm = document.getElementById('register-password-confirm').value;

    if (!email || !password || !passwordConfirm) {
        showStatus('auth-status', 'Please fill in all fields', 'error');
        return;
    }

    if (password !== passwordConfirm) {
        showStatus('auth-status', 'Passwords do not match', 'error');
        return;
    }

    // Validate password strength
    if (password.length < 8) {
        showStatus('auth-status', 'Password must be at least 8 characters', 'error');
        return;
    }

    if (!/[A-Z]/.test(password)) {
        showStatus('auth-status', 'Password must contain at least one uppercase letter', 'error');
        return;
    }

    if (!/[a-z]/.test(password)) {
        showStatus('auth-status', 'Password must contain at least one lowercase letter', 'error');
        return;
    }

    if (!/[0-9]/.test(password)) {
        showStatus('auth-status', 'Password must contain at least one number', 'error');
        return;
    }

    try {
        const response = await fetch('/api/v1/user-auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await parseJsonResponse(response, 'User registration');

        if (!response.ok || !data.success) {
            throw new Error(data.error?.message || data.error || 'Registration failed');
        }

        // Store JWT token
        localStorage.setItem('omnistream_jwt_token', data.data.token);
        localStorage.setItem('omnistream_user_email', data.data.user.email);

        showStatus('auth-status', 'Account created successfully!', 'success');

        // Clear form
        document.getElementById('register-email').value = '';
        document.getElementById('register-password').value = '';
        document.getElementById('register-password-confirm').value = '';

        // Create a default community for the user
        setTimeout(async () => {
            await createUserCommunity('My Streaming Community');
        }, 500);
    } catch (error) {
        showStatus('auth-status', error.message, 'error');
    }
}

// Load user's communities
async function loadUserCommunities() {
    const token = localStorage.getItem('omnistream_jwt_token');
    if (!token) {
        return;
    }

    try {
        const response = await fetch('/api/v1/communities', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await parseJsonResponse(response, 'Load communities');

        if (!response.ok || !data.success) {
            // Token might be expired
            if (response.status === 401) {
                localStorage.removeItem('omnistream_jwt_token');
                localStorage.removeItem('omnistream_user_email');
                showStatus('auth-status', 'Session expired. Please login again.', 'error');
                return;
            }
            throw new Error(data.error?.message || data.error || 'Failed to load communities');
        }

        // If user has communities, use the first one
        if (data.data && data.data.length > 0) {
            communityId = data.data[0].id;
            localStorage.setItem('omnistream_community_id', communityId);
            loadCommunityProfile();
        } else {
            // No communities, create a default one
            await createUserCommunity('My Streaming Community');
        }
    } catch (error) {
        showStatus('auth-status', error.message, 'error');
    }
}

// Create community for authenticated user
async function createUserCommunity(name) {
    const token = localStorage.getItem('omnistream_jwt_token');
    if (!token) {
        showStatus('auth-status', 'Please login first', 'error');
        return;
    }

    try {
        const response = await fetch('/api/v1/communities', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name })
        });

        const data = await parseJsonResponse(response, 'Create community');

        if (!response.ok || !data.success) {
            throw new Error(data.error?.message || data.error || 'Failed to create community');
        }

        // Save community ID
        communityId = data.data.id;
        localStorage.setItem('omnistream_community_id', communityId);

        showStatus('auth-status', `Welcome! Your community "${name}" has been created.`, 'success');

        // Load community profile
        setTimeout(() => {
            loadCommunityProfile();
        }, 500);
    } catch (error) {
        showStatus('auth-status', error.message, 'error');
    }
}

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

        const data = await parseJsonResponse(response, 'Create community');

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

        const data = await parseJsonResponse(response, 'Login');

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
    localStorage.removeItem('omnistream_jwt_token');
    localStorage.removeItem('omnistream_user_email');

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
        // Check if we have a JWT token (authenticated user)
        const token = localStorage.getItem('omnistream_jwt_token');

        // Build headers - include auth token if available
        const headers = {
            'Content-Type': 'application/json'
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`/api/community/${communityId}`, { headers });

        const data = await parseJsonResponse(response, 'Load community');

        if (!response.ok || !data.success) {
            // If community not found, clear localStorage and show login
            if (response.status === 404 || data.error?.includes('not found')) {
                localStorage.removeItem('omnistream_community_id');
                communityId = null;
                showStatus('auth-status', 'Community not found. Please create a new community or login with a valid ID.', 'error');
                return;
            }
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

        // Auto-refresh streams every 10 seconds
        if (!streamRefreshInterval) {
            streamRefreshInterval = setInterval(() => {
                loadStreams();
                loadPlatforms();
            }, 10000);
        }
    } catch (error) {
        showStatus('auth-status', error.message, 'error');
        // Only logout if not authenticated, otherwise just show error
        const token = localStorage.getItem('omnistream_jwt_token');
        if (!token) {
            logout();
        }
    }
}

async function loadPlatforms() {
    const platformsToCheck = ['youtube', 'facebook', 'tiktok'];
    try {
        const platformStatuses = await Promise.all(
            platformsToCheck.map(async (platformName) => {
                try {
                    const statusResponse = await fetch(`/api/auth/${platformName}/status?communityId=${communityId}`);
                    const statusData = await parseJsonResponse(statusResponse, `Status ${platformName}`);
                    return {
                        name: platformName,
                        connected: statusData.success && statusData.data && statusData.data.connected
                    };
                } catch (error) {
                    return {
                        name: platformName,
                        connected: false
                    };
                }
            })
        );

        platforms = platformStatuses;
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
            <input type="checkbox" class="platform-checkbox" name="platforms" value="${platform.name}" />
            <span>${platform.name}</span>
        </label>
    `).join('');
}

async function connectPlatform(platformName) {
    try {
        // Get the OAuth authorization URL
        const response = await fetch(`/api/auth/${platformName}/authorize?communityId=${communityId}`);

        const data = await parseJsonResponse(response, 'Load streams');

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
    if (!communityId) {
        showStatus('platform-status', 'Missing community ID', 'error');
        return;
    }

    showStatus('platform-status', `Disconnecting ${platformName}...`, 'info');
    fetch(`/api/auth/${platformName}?communityId=${communityId}`, {
        method: 'DELETE'
    }).then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Failed to disconnect platform');
        }
        showToast(`${platformName} disconnected`, 'success');
        showStatus('platform-status', `${platformName} disconnected`, 'success');
        loadPlatforms();
    }).catch((error) => {
        showStatus('platform-status', error.message, 'error');
    });
}

// Stream management functions
async function loadStreams() {
    if (!communityId) return;

    try {
        // Use the correct API endpoint with communityId as query parameter
        const response = await fetch(`/api/streams?communityId=${communityId}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error?.message || data.error || 'Failed to load streams');
        }

        streams = data.data || [];

        // Fetch detailed status for each stream
        await Promise.all(streams.map(async (stream) => {
            try {
                const statusRes = await fetch(`/api/streams/${stream.id}?communityId=${communityId}`);
                const statusData = await parseJsonResponse(statusRes, 'Stream status');
                if (statusData.success && statusData.data) {
                    if (statusData.data.stream) {
                        Object.assign(stream, statusData.data.stream);
                    }
                    stream.platformStreams = statusData.data.platformStreams || [];
                }
            } catch (err) {
                stream.platformStreams = [];
            }
        }));

        renderStreams();
    } catch (error) {
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
        const platformStreams = stream.platformStreams || [];
        const hasActivePlatform = platformStreams.some(ps => ps.status === 'live');
        const isStarting = platformStreams.some(ps => ps.status === 'starting');
        const overallStatus = hasActivePlatform ? 'live' : (isStarting ? 'starting' : 'idle');
        const cardStateClass = hasActivePlatform || isStarting ? 'active' : '';
        const platformTags = (stream.platforms || []).map(p =>
            `<span class="stream-platform-tag">${p}</span>`
        ).join('');

        // Get platform statuses
        const platformStatusHtml = platformStreams.length > 0 ? `
            <div class="platform-status-section">
                <h4>Platform Status:</h4>
                ${platformStreams.map(ps => {
                    const statusIcon = {
                        'idle': '⚫',
                        'scheduled': '⚪',
                        'starting': '🟡',
                        'live': '🔴',
                        'stopping': '🟠',
                        'error': '🔴'
                    }[ps.status] || '⚪';

                    const statusText = (ps.status || '').toUpperCase();
                    const statusClass = ps.status === 'live'
                        ? 'status-live'
                        : ps.status === 'error'
                            ? 'status-error'
                            : ps.status === 'starting'
                                ? 'status-starting'
                                : '';
                    const watchUrl = ps.liveUrl || ps.streamUrl;
                    const rtmpDetails = ps.rtmpUrl || ps.streamKey
                        ? `
                            <div class="platform-rtmp">
                                ${ps.rtmpUrl ? `
                                    <div><strong>RTMP:</strong> <code style="font-size: 0.75em;">${escapeHtml(ps.rtmpUrl)}</code></div>
                                ` : ''}
                                ${ps.streamKey ? `
                                    <div><strong>Stream Key:</strong> <code style="font-size: 0.75em;">${escapeHtml(ps.streamKey)}</code></div>
                                ` : ''}
                            </div>
                        `
                        : '';
                    const errorText = ps.error
                        ? `<div class="platform-error">⚠ ${escapeHtml(ps.error)}</div>`
                        : '';

                    return `
                        <div class="platform-status-item ${statusClass}">
                            <span class="platform-status-icon">${statusIcon}</span>
                            <span class="platform-status-name">${escapeHtml(ps.platform || '')}</span>
                            <span class="platform-status-text">${statusText || 'UNKNOWN'}</span>
                            ${watchUrl ? `
                                <a href="${escapeHtml(watchUrl)}" target="_blank" class="platform-live-url">
                                    🔗 Watch
                                </a>
                            ` : ''}
                            ${rtmpDetails}
                            ${errorText}
                        </div>
                    `;
                }).join('')}
            </div>
        ` : '';

        return `
            <div class="stream-card ${cardStateClass}">
                <div class="stream-header">
                    <div class="stream-title">${escapeHtml(stream.title)}</div>
                    <span class="stream-badge ${overallStatus}">
                        ${overallStatus === 'live' ? '🔴 LIVE' : overallStatus === 'starting' ? '🟡 Starting…' : '⚫ Idle'}
                    </span>
                </div>

                ${stream.description ? `
                    <div class="stream-description">${escapeHtml(stream.description)}</div>
                ` : ''}

                <div class="stream-platforms">${platformTags}</div>

                ${platformStatusHtml}

                ${stream.rtmpUrl || stream.ingestUrl ? `
                    <div class="stream-ingest">
                        <h4>🎬 OBS Ingest Settings (Stream to Omnistream):</h4>
                        <div style="margin-bottom: 10px;">
                            <strong>Server:</strong>
                            <code>${escapeHtml(stream.rtmpUrl || stream.ingestUrl)}</code>
                        </div>
                        ${stream.rtmpKey || stream.streamKey ? `
                            <div>
                                <strong>Stream Key:</strong>
                                <code>${escapeHtml(stream.rtmpKey || stream.streamKey)}</code>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}

                ${platformStreams.length > 0 && platformStreams.some(ps => ps.rtmpUrl) ? `
                    <div class="stream-ingest" style="background: rgba(79, 70, 229, 0.1); border-color: var(--primary-color);">
                        <h4>📺 YouTube RTMP Settings (Direct to YouTube):</h4>
                        ${platformStreams.filter(ps => ps.rtmpUrl).map(ps => `
                            <div style="margin-bottom: 10px;">
                                <strong>Platform:</strong> <span style="text-transform: capitalize;">${ps.platform}</span><br>
                                <strong>Server:</strong>
                                <code style="font-size: 0.75em;">${escapeHtml(ps.rtmpUrl)}</code>
                            </div>
                            ${ps.streamKey ? `
                                <div>
                                    <strong>Stream Key:</strong>
                                    <code style="font-size: 0.75em;">${escapeHtml(ps.streamKey)}</code>
                                </div>
                            ` : ''}
                        `).join('')}
                        <p style="margin-top: 10px; font-size: 0.85em; color: var(--text-secondary);">
                            💡 For testing: You can stream directly to YouTube using these settings
                        </p>
                    </div>
                ` : ''}

                <div class="stream-meta">
                    <small>Created: ${new Date(stream.createdAt).toLocaleString()}</small>
                </div>

                <div class="stream-actions">
                    ${overallStatus === 'live' ? `
                        <button id="stop-btn-${stream.id}" onclick="stopStream('${stream.id}')" class="btn btn-danger">
                            ⏹ Stop Stream
                        </button>
                    ` : `
                        <button id="start-btn-${stream.id}" onclick="startStream('${stream.id}')" class="btn btn-success" ${isStarting ? 'disabled' : ''}>
                            ${isStarting ? '⏳ Starting...' : '▶ Start Stream'}
                        </button>
                    `}
                    <button id="refresh-btn-${stream.id}" onclick="refreshStream('${stream.id}')" class="btn btn-secondary">
                        🔄 Refresh
                    </button>
                    <button id="delete-btn-${stream.id}" onclick="deleteStream('${stream.id}')" class="btn btn-danger">
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

    const selectedPlatforms = Array.from(document.querySelectorAll('.platform-checkbox:checked'))
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
                rtmpUrl: 'rtmp://localhost:1935/live',
                rtmpKey: `stream_${Date.now()}`
            })
        });

        const data = await parseJsonResponse(response, 'Create stream');

        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Failed to create stream');
        }

        showToast('Stream created successfully! 🎬', 'success');
        showStatus('stream-status', 'Stream created successfully!', 'success');

        // Clear form
        document.getElementById('stream-title').value = '';
        document.getElementById('stream-description').value = '';
        document.querySelectorAll('.platform-checkbox').forEach(cb => cb.checked = false);

        // Reload streams
        loadStreams();
    } catch (error) {
        showToast(error.message, 'error');
        showStatus('stream-status', error.message, 'error');
    }
}

async function startStream(streamId) {
    const button = document.getElementById(`start-btn-${streamId}`);
    if (!button) return;

    // Optimistic UI update so the card shows "Starting..."
    const targetStream = streams.find(s => s.id === streamId);
    if (targetStream) {
        targetStream.platformStreams = (targetStream.platformStreams || []).map(ps => ({
            ...ps,
            status: 'starting'
        }));
        renderStreams();
    }

    setButtonLoading(button, true);

    try {
        const response = await fetch(`/api/streams/${streamId}/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ communityId })
        });

        const data = await parseJsonResponse(response, 'Start stream');

        if (!response.ok) {
            throw new Error(data.error || 'Failed to start stream');
        }

        if (data.success && data.data) {
            const updated = data.data;
            streams = streams.map(s => s.id === streamId ? {
                ...s,
                ...(updated.stream || {}),
                platformStreams: updated.platformStreams || s.platformStreams || []
            } : s);
            renderStreams();
        }

        showToast('Stream started successfully! 🎥', 'success');
        showStatus('stream-status', 'Stream started successfully!', 'success');
        loadStreams();
    } catch (error) {
        showToast(error.message, 'error');
        showStatus('stream-status', error.message, 'error');
        if (targetStream) {
            targetStream.platformStreams = (targetStream.platformStreams || []).map(ps => ({
                ...ps,
                status: ps.status === 'starting' ? 'idle' : ps.status
            }));
            renderStreams();
        }
        setButtonLoading(button, false);
    }
}

async function stopStream(streamId) {
    const button = document.getElementById(`stop-btn-${streamId}`);
    if (!button) return;

    setButtonLoading(button, true);

    try {
        const response = await fetch(`/api/streams/${streamId}/stop`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ communityId })
        });

        const data = await parseJsonResponse(response, 'Stop stream');

        if (!response.ok) {
            throw new Error(data.error || 'Failed to stop stream');
        }

        if (data.success && data.data) {
            const updated = data.data;
            streams = streams.map(s => s.id === streamId ? {
                ...s,
                ...(updated.stream || {}),
                platformStreams: updated.platformStreams || (s.platformStreams || []).map(ps => ({
                    ...ps,
                    status: 'ended'
                }))
            } : s);
            renderStreams();
        }

        showToast('Stream stopped successfully! ⏹', 'success');
        showStatus('stream-status', 'Stream stopped successfully!', 'success');
        loadStreams();
    } catch (error) {
        showToast(error.message, 'error');
        showStatus('stream-status', error.message, 'error');
        setButtonLoading(button, false);
    }
}

async function refreshStream(streamId) {
    const button = document.getElementById(`refresh-btn-${streamId}`);
    if (!button) return;

    setButtonLoading(button, true);

    try {
        showToast('Refreshing stream status...', 'info');
        await loadStreams();
        showToast('Stream refreshed! 🔄', 'success');
    } catch (error) {
        showToast(error.message, 'error');
        showStatus('stream-status', error.message, 'error');
    } finally {
        // Button will be re-rendered by loadStreams
    }
}

async function deleteStream(streamId) {
    if (!confirm('Are you sure you want to delete this stream?')) {
        return;
    }

    const button = document.getElementById(`delete-btn-${streamId}`);
    if (button) {
        setButtonLoading(button, true);
    }

    try {
        const response = await fetch(`/api/streams/${streamId}?communityId=${communityId}`, {
            method: 'DELETE'
        });

        const data = await parseJsonResponse(response, 'Delete stream');

        if (!response.ok) {
            throw new Error(data.error || 'Failed to delete stream');
        }

        showToast('Stream deleted successfully! 🗑', 'success');
        showStatus('stream-status', 'Stream deleted successfully!', 'success');
        loadStreams();
    } catch (error) {
        showToast(error.message, 'error');
        showStatus('stream-status', error.message, 'error');
        if (button) {
            setButtonLoading(button, false);
        }
    }
}

// Utility functions
function showStatus(elementId, message, type) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.className = `status-message ${type}`;
    element.style.display = 'block';

    // Auto-hide after 5 seconds for success/info messages
    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    } else if (type === 'error') {
        // Keep error messages visible longer
        setTimeout(() => {
            element.style.display = 'none';
        }, 10000);
    }
}

// Toast notification system
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icon = {
        success: '✓',
        error: '✗',
        info: 'ℹ',
        warning: '⚠'
    }[type] || 'ℹ';

    toast.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-message">${escapeHtml(message)}</span>`;

    const container = document.getElementById('toast-container') || createToastContainer();
    container.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Auto-remove
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, type === 'error' ? 5000 : 3000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
    return container;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Safely parse JSON, throwing a clear error when the backend returns HTML/error pages
async function parseJsonResponse(response, context = 'request') {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        return response.json();
    }

    const text = await response.text();
    const snippet = text ? text.slice(0, 200) : 'No body';
    throw new Error(`${context} failed (status ${response.status}): non-JSON response: ${snippet}`);
}

// Button loading state management
function setButtonLoading(button, loading) {
    if (loading) {
        button.disabled = true;
        button.dataset.originalText = button.innerHTML;
        button.innerHTML = '<span class="spinner"></span> Loading...';
    } else {
        button.disabled = false;
        button.innerHTML = button.dataset.originalText || button.innerHTML;
    }
}
