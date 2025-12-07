// Global state
let communityData = null;
let communityId = null;
let platforms = [];
let streams = [];
let streamRefreshInterval = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    const jwtToken = localStorage.getItem('omnistream_jwt_token');

    // If user has JWT token, show user platforms section and hide auth
    if (jwtToken) {
        // Clear old community ID - let loadUserCommunities() fetch the correct one
        localStorage.removeItem('omnistream_community_id');
        communityId = null;

        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('schedule-event-section').style.display = 'block';
        document.getElementById('create-post-section').style.display = 'block';
        document.getElementById('user-platforms-section').style.display = 'block';
        document.getElementById('streams-section').style.display = 'block';

        // Initialize character counter for post content
        const postContentTextarea = document.getElementById('post-content');
        if (postContentTextarea) {
            postContentTextarea.addEventListener('input', updateCharCounter);
        }

        // Load scheduled events
        loadScheduledEvents();

        // Load user platforms
        if (window.userPlatforms && window.userPlatforms.loadUserPlatforms) {
            window.userPlatforms.loadUserPlatforms();
        }

        // Load platform checkboxes for stream creation
        setTimeout(() => {
            renderPlatformCheckboxes();
        }, 1000);

        // Load user's communities
        loadUserCommunities();
    } else {
        // Legacy mode - try to load old community ID if exists
        communityId = localStorage.getItem('omnistream_community_id');
        if (communityId) {
            loadCommunityProfile();
        }
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

        // Show user platforms section
        document.getElementById('schedule-event-section').style.display = 'block';
        document.getElementById('create-post-section').style.display = 'block';
        document.getElementById('user-platforms-section').style.display = 'block';

        // Load scheduled events
        loadScheduledEvents();

        // Load user platforms
        if (window.userPlatforms && window.userPlatforms.loadUserPlatforms) {
            setTimeout(() => {
                window.userPlatforms.loadUserPlatforms();
            }, 500);
        }

        // Load platform checkboxes for stream creation
        setTimeout(() => {
            renderPlatformCheckboxes();
        }, 1000);

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

        // Show user platforms section
        document.getElementById('schedule-event-section').style.display = 'block';
        document.getElementById('create-post-section').style.display = 'block';
        document.getElementById('user-platforms-section').style.display = 'block';

        // Load scheduled events
        loadScheduledEvents();

        // Load user platforms
        if (window.userPlatforms && window.userPlatforms.loadUserPlatforms) {
            setTimeout(() => {
                window.userPlatforms.loadUserPlatforms();
            }, 500);
        }

        // Load platform checkboxes for stream creation
        setTimeout(() => {
            renderPlatformCheckboxes();
        }, 1000);

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
    document.getElementById('schedule-event-section').style.display = 'none';
    document.getElementById('create-post-section').style.display = 'none';
    document.getElementById('user-platforms-section').style.display = 'none';
    document.getElementById('streams-section').style.display = 'none';

    showStatus('auth-status', 'Logged out successfully', 'info');
}

async function loadCommunityProfile() {
    try {
        // Check if we have a JWT token (authenticated user)
        const token = localStorage.getItem('omnistream_jwt_token');

        // If no communityId is set, skip loading (user might not have created a community yet)
        if (!communityId) {
            console.log('No community ID set, skipping community profile load');

            // Show UI for JWT authenticated users even without community
            if (token) {
                document.getElementById('auth-section').style.display = 'none';
                document.getElementById('profile-section').style.display = 'none';
                document.getElementById('schedule-event-section').style.display = 'block';
                document.getElementById('create-post-section').style.display = 'block';
                document.getElementById('user-platforms-section').style.display = 'block';
                document.getElementById('streams-section').style.display = 'block';

                // Load scheduled events
                loadScheduledEvents();

                // Load user platforms if logged in with JWT
                if (window.userPlatforms && window.userPlatforms.loadUserPlatforms) {
                    window.userPlatforms.loadUserPlatforms();
                }
            }
            return;
        }

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
            // If community not found, clear localStorage
            if (response.status === 404 || data.error?.includes('not found')) {
                localStorage.removeItem('omnistream_community_id');
                communityId = null;

                // If user has JWT token, they're authenticated with new system - silently skip old community error
                if (token) {
                    console.log('Old community ID cleared. You can create a new community from the Community ID tab if needed.');

                    // Show user platforms section even without community
                    document.getElementById('auth-section').style.display = 'none';
                    document.getElementById('profile-section').style.display = 'none';
                    document.getElementById('schedule-event-section').style.display = 'block';
                    document.getElementById('create-post-section').style.display = 'block';
                    document.getElementById('user-platforms-section').style.display = 'block';
                    document.getElementById('streams-section').style.display = 'block';

                    // Load scheduled events
                    loadScheduledEvents();

                    // Load user platforms
                    if (window.userPlatforms && window.userPlatforms.loadUserPlatforms) {
                        window.userPlatforms.loadUserPlatforms();
                    }
                    return;
                }

                // Only show error if user is not authenticated with JWT (old system only)
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
        document.getElementById('schedule-event-section').style.display = 'block';
        document.getElementById('create-post-section').style.display = 'block';
        document.getElementById('user-platforms-section').style.display = 'block';
        document.getElementById('streams-section').style.display = 'block';

        // Load scheduled events
        loadScheduledEvents();

        // Load user platforms if logged in with JWT
        if (token && window.userPlatforms && window.userPlatforms.loadUserPlatforms) {
            window.userPlatforms.loadUserPlatforms();
        }

        // Load platform checkboxes for stream creation
        if (token) {
            renderPlatformCheckboxes();
        }

        loadStreams();

        // Auto-refresh streams every 10 seconds
        if (!streamRefreshInterval) {
            streamRefreshInterval = setInterval(() => {
                loadStreams();
            }, 10000);
        }
    } catch (error) {
        // Check if user has JWT token
        const token = localStorage.getItem('omnistream_jwt_token');

        // Only show error if user is not authenticated with JWT
        if (!token) {
            showStatus('auth-status', error.message, 'error');
            logout();
        } else {
            // Authenticated users - just log the error, don't show UI error
            console.error('Community load error (non-critical for JWT users):', error.message);
        }
    }
}

// Old loadPlatforms - now handled by user-platforms.js
async function loadPlatforms() {
    // No longer needed - using user-based platform connections
    return;
}

function renderPlatforms() {
    // No longer needed - using user-based platform connections
    return;
}

function renderPlatformCheckboxes() {
    // Load platform checkboxes from user's connected platforms
    const container = document.getElementById('platform-checkboxes');
    if (!container) return;

    const token = localStorage.getItem('omnistream_jwt_token');
    if (!token) {
        container.innerHTML = '<p class="info-text">Please login to connect platforms and create streams.</p>';
        return;
    }

    // Show loading state
    container.innerHTML = '<p class="info-text">Loading your connected platforms...</p>';

    // Platform icons for better UI
    const platformIcons = {
        twitter: '𝕏',
        telegram: '✈',
        youtube: '▶',
        facebook: '👥',
        instagram: '📷'
    };

    // Fetch user's connected platforms
    fetch('/api/v1/platforms', {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(res => res.json())
    .then(data => {
        if (data.success && data.data.platforms && data.data.platforms.length > 0) {
            container.innerHTML = data.data.platforms.map(p => {
                const platformName = p.platform.charAt(0).toUpperCase() + p.platform.slice(1);
                const icon = platformIcons[p.platform.toLowerCase()] || '📡';

                return `
                    <label class="platform-checkbox-label">
                        <input type="checkbox" class="platform-checkbox" name="platforms" value="${p.platform}" checked>
                        <span>${icon} ${platformName}</span>
                        <small style="margin-left: auto;">✓ Connected</small>
                    </label>
                `;
            }).join('');
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <p>📱 No platforms connected yet.</p>
                    <p class="info-text">Please connect at least one platform in the <strong>"Connect Social Platforms"</strong> section above to create streams.</p>
                </div>
            `;
        }
    })
    .catch(err => {
        console.error('Failed to load platforms:', err);
        container.innerHTML = `
            <p class="info-text" style="color: var(--danger);">
                ⚠️ Failed to load platforms. Please refresh the page.
            </p>
        `;
    });
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
                        <div class="mb-2">
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
                    <div class="stream-ingest">
                        <h4>📺 YouTube RTMP Settings (Direct to YouTube):</h4>
                        ${platformStreams.filter(ps => ps.rtmpUrl).map(ps => `
                            <div class="mb-2">
                                <strong>Platform:</strong> <span style="text-transform: capitalize;">${ps.platform}</span><br>
                                <strong>Server:</strong>
                                <code>${escapeHtml(ps.rtmpUrl)}</code>
                            </div>
                            ${ps.streamKey ? `
                                <div>
                                    <strong>Stream Key:</strong>
                                    <code>${escapeHtml(ps.streamKey)}</code>
                                </div>
                            ` : ''}
                        `).join('')}
                        <p class="info-text mt-4">
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
                    <a href="/chat?streamId=${stream.id}&communityId=${communityId}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">
                        💬 Open Chat
                    </a>
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

// ==================== UNIFIED POSTING SYSTEM ====================

// Update character counter for post content
function updateCharCounter() {
    const textarea = document.getElementById('post-content');
    const counter = document.getElementById('char-counter');
    if (textarea && counter) {
        const length = textarea.value.length;
        const maxLength = textarea.maxLength;
        counter.textContent = `${length} / ${maxLength} characters`;

        // Change color if near limit
        if (length > maxLength * 0.9) {
            counter.style.color = '#ff4444';
        } else if (length > maxLength * 0.8) {
            counter.style.color = '#ff9800';
        } else {
            counter.style.color = '#666';
        }
    }
}

// Publish post to selected platforms
async function publishPost() {
    const jwtToken = localStorage.getItem('omnistream_jwt_token');
    if (!jwtToken) {
        showPostError('Please login to publish posts');
        return;
    }

    // Get form values
    const content = document.getElementById('post-content').value.trim();
    const mediaUrl = document.getElementById('post-media-url').value.trim() || undefined;

    // Get selected platforms
    const selectedPlatforms = [];
    const checkboxes = ['post-platform-twitter', 'post-platform-facebook', 'post-platform-telegram', 'post-platform-youtube'];
    checkboxes.forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox && checkbox.checked) {
            selectedPlatforms.push(checkbox.value);
        }
    });

    // Validate input
    if (!content) {
        showPostError('Please enter post content');
        return;
    }

    if (selectedPlatforms.length === 0) {
        showPostError('Please select at least one platform');
        return;
    }

    // Show loading state
    showPostLoading();
    hidePostError();
    hidePostSuccess();
    document.getElementById('post-results').style.display = 'none';

    try {
        const response = await fetch('/api/v1/posts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwtToken}`
            },
            body: JSON.stringify({
                content,
                mediaUrl,
                platforms: selectedPlatforms
            })
        });

        const data = await parseJsonResponse(response, 'Post creation');

        // Hide loading
        hidePostLoading();

        // Show results
        displayPostResults(data.results);

        // Determine if we should show success or partial success
        const hasPosted = Object.values(data.results).some(r => r.status === 'posted');
        const hasFailed = Object.values(data.results).some(r => r.status === 'failed');

        if (hasPosted && !hasFailed) {
            showPostSuccess('Post published successfully to all platforms!');
            clearPostForm();
        } else if (hasPosted && hasFailed) {
            showPostSuccess('Post published with some errors. Check results below.');
        } else {
            showPostError('Failed to publish post to any platform. Check results below.');
        }

    } catch (error) {
        hidePostLoading();
        showPostError(`Error: ${error.message}`);
        console.error('Post error:', error);
    }
}

// Display post results for each platform
function displayPostResults(results) {
    const resultsContainer = document.getElementById('post-results-list');
    const resultsSection = document.getElementById('post-results');

    if (!resultsContainer || !resultsSection) return;

    resultsContainer.innerHTML = '';
    resultsSection.style.display = 'block';

    const platformIcons = {
        twitter: '𝕏',
        telegram: '✈',
        youtube: '▶'
    };

    const platformNames = {
        twitter: 'Twitter / X',
        telegram: 'Telegram',
        youtube: 'YouTube'
    };

    for (const [platform, result] of Object.entries(results)) {
        const resultCard = document.createElement('div');
        resultCard.style.cssText = `
            padding: 15px;
            margin-bottom: 10px;
            border-radius: 8px;
            border: 1px solid #ddd;
            display: flex;
            align-items: center;
            justify-content: space-between;
        `;

        let statusBadge = '';
        let statusColor = '';
        let resultMessage = '';

        if (result.status === 'posted') {
            statusColor = '#4CAF50';
            statusBadge = '✅ Posted';
            resultMessage = result.postUrl
                ? `<a href="${result.postUrl}" target="_blank" style="color: #1976d2; text-decoration: none;">View Post →</a>`
                : 'Successfully posted';
        } else if (result.status === 'failed') {
            statusColor = '#f44336';
            statusBadge = '❌ Failed';
            resultMessage = result.error || 'Unknown error';
        } else if (result.status === 'unsupported') {
            statusColor = '#ff9800';
            statusBadge = '⚠️ Unsupported';
            resultMessage = result.error || 'Platform does not support posting';
        }

        resultCard.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 24px;">${platformIcons[platform] || '•'}</span>
                <div>
                    <strong style="display: block; font-size: 16px;">${platformNames[platform] || platform}</strong>
                    <span style="color: ${statusColor}; font-weight: 600; font-size: 14px;">${statusBadge}</span>
                    <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">${resultMessage}</p>
                </div>
            </div>
        `;

        resultsContainer.appendChild(resultCard);
    }
}

// Clear post form
function clearPostForm() {
    document.getElementById('post-content').value = '';
    document.getElementById('post-media-url').value = '';
    updateCharCounter();

    // Uncheck all platform checkboxes
    const checkboxes = ['post-platform-twitter', 'post-platform-telegram', 'post-platform-youtube'];
    checkboxes.forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) checkbox.checked = false;
    });
}

// Post UI helper functions
function showPostLoading() {
    const el = document.getElementById('post-loading');
    if (el) el.style.display = 'block';
}

function hidePostLoading() {
    const el = document.getElementById('post-loading');
    if (el) el.style.display = 'none';
}

function showPostSuccess(message) {
    const el = document.getElementById('post-success');
    if (el) {
        el.textContent = message;
        el.style.display = 'block';
        setTimeout(() => { el.style.display = 'none'; }, 5000);
    }
}

function hidePostSuccess() {
    const el = document.getElementById('post-success');
    if (el) el.style.display = 'none';
}

function showPostError(message) {
    const el = document.getElementById('post-error');
    if (el) {
        el.textContent = message;
        el.style.display = 'block';
    }
}

function hidePostError() {
    const el = document.getElementById('post-error');
    if (el) el.style.display = 'none';
}

// ==================== UNIFIED SCHEDULING SYSTEM ====================

// Toggle schedule form fields based on type
function toggleScheduleFormFields() {
    const type = document.getElementById('schedule-type').value;
    const contentGroup = document.getElementById('schedule-content-group');
    const descriptionGroup = document.getElementById('schedule-description-group');
    const mediaGroup = document.getElementById('schedule-media-group');
    const titleLabel = document.querySelector('label[for="schedule-title"]');

    if (type === 'post') {
        // For posts: show content and media, hide description, change title label
        if (contentGroup) contentGroup.style.display = 'block';
        if (descriptionGroup) descriptionGroup.style.display = 'none';
        if (mediaGroup) mediaGroup.style.display = 'block';
        if (titleLabel) titleLabel.textContent = 'Title (Optional)';
    } else {
        // For streams: show description, hide content and media, change title label
        if (contentGroup) contentGroup.style.display = 'none';
        if (descriptionGroup) descriptionGroup.style.display = 'block';
        if (mediaGroup) mediaGroup.style.display = 'none';
        if (titleLabel) titleLabel.textContent = 'Title';
    }
}

// Schedule an event
async function scheduleEvent() {
    const jwtToken = localStorage.getItem('omnistream_jwt_token');
    if (!jwtToken) {
        showScheduleError('Please login to schedule events');
        return;
    }

    // Get form values
    const type = document.getElementById('schedule-type').value;
    const title = document.getElementById('schedule-title').value.trim();
    const description = document.getElementById('schedule-description').value.trim() || undefined;
    const content = document.getElementById('schedule-content').value.trim() || undefined;
    const mediaUrl = document.getElementById('schedule-media-url').value.trim() || undefined;
    const datetime = document.getElementById('schedule-datetime').value;

    // Get selected platforms
    const selectedPlatforms = [];
    const checkboxes = ['schedule-platform-youtube', 'schedule-platform-twitter', 'schedule-platform-facebook', 'schedule-platform-telegram'];
    checkboxes.forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox && checkbox.checked) {
            selectedPlatforms.push(checkbox.value);
        }
    });

    // Validate input
    if (type === 'post') {
        if (!content && !title) {
            showScheduleError('Please enter post content or title');
            return;
        }
    } else {
        if (!title) {
            showScheduleError('Please enter an event title');
            return;
        }
    }

    if (!datetime) {
        showScheduleError('Please select a date and time');
        return;
    }

    if (selectedPlatforms.length === 0) {
        showScheduleError('Please select at least one platform');
        return;
    }

    // Convert datetime to ISO string
    const scheduledAt = new Date(datetime).toISOString();

    // Show loading
    showScheduleLoading();
    hideScheduleError();
    hideScheduleSuccess();

    try {
        const response = await fetch('/api/v1/schedule', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwtToken}`
            },
            body: JSON.stringify({
                platforms: selectedPlatforms,
                type,
                title: title || undefined,
                description,
                content,
                mediaUrl,
                scheduledAt
            })
        });

        const data = await parseJsonResponse(response, 'Event scheduling');

        hideScheduleLoading();

        if (!response.ok || !data.success) {
            throw new Error(data.error?.message || 'Failed to schedule event');
        }

        showScheduleSuccess(`Event scheduled successfully! Job ID: ${data.jobId}`);
        clearScheduleForm();

        // Reload events list
        await loadScheduledEvents();
    } catch (error) {
        hideScheduleLoading();
        showScheduleError(`Error: ${error.message}`);
        console.error('Schedule error:', error);
    }
}

// Load scheduled events
async function loadScheduledEvents() {
    const jwtToken = localStorage.getItem('omnistream_jwt_token');
    if (!jwtToken) {
        return;
    }

    try {
        const response = await fetch('/api/v1/schedule', {
            headers: {
                'Authorization': `Bearer ${jwtToken}`
            }
        });

        const data = await parseJsonResponse(response, 'Load scheduled events');

        if (!response.ok || !data.success) {
            console.error('Failed to load scheduled events:', data.error);
            return;
        }

        console.log('Loaded scheduled events:', data.jobs);
        displayScheduledEvents(data.jobs || []);
    } catch (error) {
        console.error('Error loading scheduled events:', error);
    }
}

// Display scheduled events
function displayScheduledEvents(jobs) {
    const listContainer = document.getElementById('upcoming-events-list');
    const noEventsMessage = document.getElementById('no-events-message');

    if (!listContainer) return;

    if (jobs.length === 0) {
        listContainer.innerHTML = '<p class="text-muted" id="no-events-message">No scheduled events</p>';
        return;
    }

    if (noEventsMessage) noEventsMessage.style.display = 'none';

    const platformIcons = {
        twitter: '𝕏',
        telegram: '✈',
        youtube: '▶',
        facebook: '👥',
        instagram: '📷'
    };

    const statusColors = {
        pending: '#ff9800',
        running: '#2196F3',
        done: '#4CAF50',
        failed: '#f44336'
    };

    listContainer.innerHTML = jobs.map(job => {
        const scheduledDate = new Date(job.scheduledAt);
        const isPast = scheduledDate < new Date();
        const statusColor = statusColors[job.status] || '#666';

        console.log('Job platforms:', job.platforms);
        console.log('Job payload:', job.payload);

        // Parse results from payload if job is done/failed
        const results = job.payload?.results || {};

        // Create platform status badges with results
        const platformBadges = job.platforms.map(p => {
            const icon = platformIcons[p] || '•';
            const name = p.charAt(0).toUpperCase() + p.slice(1);
            const result = results[p];

            let badgeColor = '#f0f0f0';
            let statusIcon = '';
            let statusText = '';

            if (job.status === 'done' || job.status === 'failed') {
                if (result) {
                    if (result.status === 'posted' || result.status === 'scheduled') {
                        badgeColor = '#e8f5e9';
                        statusIcon = '✓';
                        statusText = result.postUrl ? `<a href="${escapeHtml(result.postUrl)}" target="_blank" style="color: #2e7d32; text-decoration: none; font-size: 11px;">View →</a>` : '';
                    } else if (result.status === 'failed') {
                        badgeColor = '#ffebee';
                        statusIcon = '✗';
                        const errorMsg = result.error || 'Unknown error';
                        statusText = `<span style="color: #c62828; font-size: 11px; cursor: help;" title="${escapeHtml(errorMsg)}">Error: ${escapeHtml(errorMsg.substring(0, 30))}${errorMsg.length > 30 ? '...' : ''}</span>`;
                    } else if (result.status === 'unsupported') {
                        badgeColor = '#fff3e0';
                        statusIcon = '⚠';
                        const errorMsg = result.error || 'Not supported';
                        statusText = `<span style="color: #ef6c00; font-size: 11px; cursor: help;" title="${escapeHtml(errorMsg)}">Unsupported</span>`;
                    }
                }
            }

            return `<span style="display: inline-flex; flex-direction: column; align-items: flex-start; gap: 2px; background: ${badgeColor}; padding: 6px 10px; border-radius: 8px; font-size: 13px; margin-right: 6px; margin-bottom: 6px;">
                <span style="display: flex; align-items: center; gap: 4px;">
                    ${icon} ${name} ${statusIcon}
                </span>
                ${statusText}
            </span>`;
        }).join('');

        return `
            <div style="
                padding: 15px;
                border: 1px solid #ddd;
                border-radius: 8px;
                background: ${isPast ? '#f9f9f9' : 'white'};
            ">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;">
                        <h4 style="margin: 0 0 5px 0; font-size: 16px;">${escapeHtml(job.title || 'Untitled Event')}</h4>
                        <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">${escapeHtml(job.description || job.payload?.content || '')}</p>
                        <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center; font-size: 14px; color: #666; margin-bottom: 8px;">
                            <span>📅 ${scheduledDate.toLocaleString()}</span>
                            <span style="text-transform: capitalize;">Type: ${job.type}</span>
                        </div>
                        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                            ${platformBadges}
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 5px;">
                        <span style="
                            background: ${statusColor};
                            color: white;
                            padding: 4px 12px;
                            border-radius: 12px;
                            font-size: 12px;
                            font-weight: 600;
                            text-transform: uppercase;
                        ">${job.status}</span>
                        ${isPast ? '<small style="color: #999;">Past</small>' : '<small style="color: #4CAF50;">Upcoming</small>'}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Clear schedule form
function clearScheduleForm() {
    document.getElementById('schedule-title').value = '';
    document.getElementById('schedule-description').value = '';
    document.getElementById('schedule-content').value = '';
    document.getElementById('schedule-media-url').value = '';
    document.getElementById('schedule-datetime').value = '';

    // Uncheck all platform checkboxes
    const checkboxes = ['schedule-platform-youtube', 'schedule-platform-twitter', 'schedule-platform-telegram', 'schedule-platform-facebook'];
    checkboxes.forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) checkbox.checked = false;
    });
}

// Schedule UI helper functions
function showScheduleLoading() {
    const el = document.getElementById('schedule-loading');
    if (el) el.style.display = 'block';
}

function hideScheduleLoading() {
    const el = document.getElementById('schedule-loading');
    if (el) el.style.display = 'none';
}

function showScheduleSuccess(message) {
    const el = document.getElementById('schedule-success');
    if (el) {
        el.textContent = message;
        el.style.display = 'block';
        setTimeout(() => { el.style.display = 'none'; }, 5000);
    }
}

function hideScheduleSuccess() {
    const el = document.getElementById('schedule-success');
    if (el) el.style.display = 'none';
}

function showScheduleError(message) {
    const el = document.getElementById('schedule-error');
    if (el) {
        el.textContent = message;
        el.style.display = 'block';
    }
}

function hideScheduleError() {
    const el = document.getElementById('schedule-error');
    if (el) el.style.display = 'none';
}

// =======================
// LIVE CHAT FUNCTIONALITY
// =======================

let chatWebSocket = null;
let currentStreamId = null;
let currentCommunityId = null;
let chatMessages = [];
let chatSendPlatforms = [];
let platformFilters = {
    youtube: true,
    telegram: true,
    facebook: true
};
let platformStats = {
    youtube: 0,
    telegram: 0,
    facebook: 0
};

/**
 * Connect to live chat for a stream
 * Auto-called when user selects a stream
 */
function connectToLiveChat(streamId, communityId) {
    // Disconnect from previous stream if connected
    if (chatWebSocket) {
        disconnectFromLiveChat();
    }

    currentStreamId = streamId;
    currentCommunityId = communityId;

    // Determine available platforms for this stream to populate the send dropdown
    const targetStream = streams.find(s => s.id === streamId);
    const availablePlatforms = Array.from(new Set([
        ...(targetStream?.platformStreams || []).map(ps => ps.platform),
        ...(targetStream?.platforms || [])
    ])).filter(Boolean);
    chatSendPlatforms = availablePlatforms;
    renderChatSendPlatformOptions(availablePlatforms);

    // Show chat section
    const chatSection = document.getElementById('live-chat-section');
    if (chatSection) {
        chatSection.style.display = 'block';
    }

    // Load chat history first
    loadChatHistory(streamId);

    // Connect to WebSocket
    const wsUrl = 'ws://localhost:3000/ws/chat';
    chatWebSocket = new WebSocket(wsUrl);

    chatWebSocket.onopen = () => {
        console.log('Chat WebSocket connected');
        updateChatConnectionIndicator(true);

        // Subscribe to stream
        chatWebSocket.send(JSON.stringify({
            type: 'subscribe',
            streamId: streamId,
            communityId: communityId
        }));
    };

    chatWebSocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Chat message received:', data);

        switch (data.type) {
            case 'connected':
                console.log('Chat server:', data.message);
                break;

            case 'subscribed':
                console.log('Subscribed to stream:', data.streamId);
                break;

            case 'message':
                handleIncomingChatMessage(data.message);
                break;

            case 'messageHighlighted':
                highlightChatMessage(data.messageId);
                break;

            case 'messageSent':
                console.log('Message sent successfully');
                break;

            case 'error':
                console.error('Chat error:', data.error);
                alert('Chat error: ' + data.error);
                break;

            default:
                console.log('Unknown chat message type:', data.type);
        }
    };

    chatWebSocket.onerror = (error) => {
        console.error('Chat WebSocket error:', error);
        updateChatConnectionIndicator(false);
    };

    chatWebSocket.onclose = () => {
        console.log('Chat WebSocket closed');
        updateChatConnectionIndicator(false);
        chatWebSocket = null;
    };
}

/**
 * Disconnect from live chat
 */
function disconnectFromLiveChat() {
    if (chatWebSocket) {
        chatWebSocket.send(JSON.stringify({ type: 'unsubscribe' }));
        chatWebSocket.close();
        chatWebSocket = null;
    }

    updateChatConnectionIndicator(false);
    currentStreamId = null;
    currentCommunityId = null;
}

/**
 * Load chat history from REST API
 */
async function loadChatHistory(streamId) {
    try {
        const response = await fetch(`/api/v1/chat/${streamId}`);
        const data = await response.json();

        if (data.success && data.data.messages) {
            chatMessages = data.data.messages;
            renderAllChatMessages();
            updateChatStats();
        }
    } catch (error) {
        console.error('Failed to load chat history:', error);
    }
}

/**
 * Handle incoming chat message from WebSocket
 */
function handleIncomingChatMessage(message) {
    chatMessages.push(message);
    platformStats[message.platform] = (platformStats[message.platform] || 0) + 1;

    addChatMessageToUI(message);
    updateChatStats();
}

/**
 * Add chat message to UI
 */
function addChatMessageToUI(message) {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;

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
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span class="platform-badge ${message.platform}">${message.platform.toUpperCase()}</span>
            <span style="font-size: 12px; color: #999;">${timestamp}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            ${message.authorImageUrl ? `<img src="${message.authorImageUrl}" alt="${escapeHtml(message.authorName)}" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;">` : ''}
            <span style="font-weight: 600; font-size: 14px; color: #333;">${escapeHtml(message.authorName)}</span>
        </div>
        <div style="color: #555; line-height: 1.5; word-wrap: break-word;">${escapeHtml(message.message)}</div>
        <div style="margin-top: 8px;">
            <button onclick="highlightMessage('${message.id}', '${message.platform}')" style="background: none; border: none; cursor: pointer; padding: 4px 8px; border-radius: 4px; font-size: 14px; transition: background 0.2s;" title="Highlight">⭐</button>
        </div>
    `;

    messageEl.style.cssText = `
        background: white;
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 12px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        border-left: 4px solid ${getPlatformColor(message.platform)};
        transition: all 0.3s ease;
    `;

    messagesContainer.appendChild(messageEl);

    // Auto-scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * Render all chat messages (for history load)
 */
function renderAllChatMessages() {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;

    messagesContainer.innerHTML = '';

    chatMessages.forEach(message => {
        addChatMessageToUI(message);
    });
}

/**
 * Send a chat message
 */
function sendChatMessage() {
    const input = document.getElementById('chat-message-input');
    const platformSelect = document.getElementById('chat-send-platform');
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    const platform = platformSelect ? platformSelect.value : '';
    if (!platform) {
        alert('Select a platform to send your message.');
        return;
    }

    if (!chatWebSocket || chatWebSocket.readyState !== WebSocket.OPEN) {
        alert('Not connected to chat server');
        return;
    }

    chatWebSocket.send(JSON.stringify({
        type: 'sendMessage',
        text: text,
        streamId: currentStreamId,
        communityId: currentCommunityId,
        platform
    }));

    input.value = '';
}

/**
 * Render platform options for sending chat messages
 */
function renderChatSendPlatformOptions(platforms) {
    const select = document.getElementById('chat-send-platform');
    if (!select) return;

    if (!platforms || platforms.length === 0) {
        select.innerHTML = '<option value=\"\">No platforms available</option>';
        return;
    }

    select.innerHTML = '<option value=\"\">Select platform</option>' + platforms.map(p => {
        const name = p.charAt(0).toUpperCase() + p.slice(1);
        return `<option value=\"${p}\">${name}</option>`;
    }).join('');
}

/**
 * Highlight a message
 */
function highlightMessage(messageId, platform) {
    if (!chatWebSocket || chatWebSocket.readyState !== WebSocket.OPEN) {
        alert('Not connected to chat server');
        return;
    }

    chatWebSocket.send(JSON.stringify({
        type: 'highlight',
        messageId: messageId,
        platform: platform
    }));
}

/**
 * Handle message highlight response
 */
function highlightChatMessage(messageId) {
    const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageEl) {
        messageEl.style.background = '#fff9e6';
        messageEl.style.borderLeftColor = '#ffc107';
        messageEl.style.boxShadow = '0 4px 12px rgba(255, 193, 7, 0.3)';
    }
}

/**
 * Toggle platform filter
 */
function togglePlatformFilter(platform) {
    platformFilters[platform] = !platformFilters[platform];
    filterChatMessages();
}

/**
 * Filter messages based on platform selection
 */
function filterChatMessages() {
    const messages = document.querySelectorAll('.chat-message');
    messages.forEach(msg => {
        const platform = msg.getAttribute('data-platform');
        if (platformFilters[platform]) {
            msg.style.display = 'block';
        } else {
            msg.style.display = 'none';
        }
    });
}

/**
 * Clear all chat messages
 */
function clearChatMessages() {
    if (confirm('Are you sure you want to clear all chat messages?')) {
        chatMessages = [];
        platformStats = { youtube: 0, telegram: 0, facebook: 0 };

        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer) {
            messagesContainer.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 50px 20px; color: #999;">
                    <p style="font-size: 18px; margin: 10px 0;">💬</p>
                    <p>Chat cleared</p>
                    <p style="font-size: 14px; opacity: 0.7;">New messages will appear here</p>
                </div>
            `;
        }

        updateChatStats();
    }
}

/**
 * Export chat messages to JSON
 */
function exportChatMessages() {
    if (chatMessages.length === 0) {
        alert('No messages to export');
        return;
    }

    const dataStr = JSON.stringify(chatMessages, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-export-${currentStreamId}-${new Date().toISOString()}.json`;
    a.click();

    URL.revokeObjectURL(url);
}

/**
 * Update chat statistics
 */
function updateChatStats() {
    const totalMessages = chatMessages.length;
    const countEl = document.getElementById('chat-message-count');
    if (countEl) {
        countEl.textContent = `${totalMessages} message${totalMessages !== 1 ? 's' : ''}`;
    }

    // Update platform stats
    Object.keys(platformStats).forEach(platform => {
        const statEl = document.getElementById(`stat-${platform}`);
        if (statEl) {
            statEl.textContent = platformStats[platform];
        }
    });
}

/**
 * Update connection indicator
 */
function updateChatConnectionIndicator(connected) {
    const indicator = document.getElementById('chat-connection-indicator');
    if (!indicator) return;

    if (connected) {
        indicator.className = 'status-dot connected';
        indicator.title = 'Connected';
    } else {
        indicator.className = 'status-dot disconnected';
        indicator.title = 'Disconnected';
    }
}

/**
 * Get platform color for border
 */
function getPlatformColor(platform) {
    const colors = {
        youtube: '#ff0000',
        telegram: '#0088cc',
        facebook: '#1877f2',
        twitter: '#1da1f2',
        instagram: '#e6683c',
        tiktok: '#000000'
    };
    return colors[platform] || '#667eea';
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
