/**
 * Generates the Server Landing Page HTML with API documentation and Frontend URL redirection.
 */
function getLandingPageHtml(config) {
  const frontendUrl = process.env.FRONTEND_URL || (config.cors && config.cors.origin) || 'http://localhost:4200';
  const nodeEnv = config.nodeEnv || process.env.NODE_ENV || 'development';
  const port = config.port || process.env.PORT || 3000;
  const startTime = new Date().toISOString();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Portfolio Backend API | Server Running</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-main: #0b0f19;
      --bg-card: rgba(18, 26, 44, 0.75);
      --bg-card-hover: rgba(26, 38, 64, 0.85);
      --border-color: rgba(255, 255, 255, 0.08);
      --border-accent: rgba(99, 102, 241, 0.3);
      --text-primary: #f8fafc;
      --text-secondary: #94a3b8;
      --text-muted: #64748b;
      --accent-indigo: #6366f1;
      --accent-purple: #8b5cf6;
      --accent-cyan: #06b6d4;
      --accent-emerald: #10b981;
      --accent-amber: #f59e0b;
      --accent-rose: #f43f5e;
      --method-get: #3b82f6;
      --method-post: #10b981;
      --method-put: #f59e0b;
      --method-delete: #ef4444;
      --radius-sm: 8px;
      --radius-md: 12px;
      --radius-lg: 18px;
      --shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);
      --shadow-glow: 0 0 25px rgba(99, 102, 241, 0.25);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: var(--bg-main);
      color: var(--text-primary);
      min-height: 100vh;
      line-height: 1.6;
      overflow-x: hidden;
      background-image: 
        radial-gradient(circle at 15% 15%, rgba(99, 102, 241, 0.15) 0%, transparent 45%),
        radial-gradient(circle at 85% 85%, rgba(6, 182, 212, 0.12) 0%, transparent 45%),
        radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.08) 0%, transparent 60%);
      background-attachment: fixed;
    }

    /* Scrollbar */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    ::-webkit-scrollbar-track {
      background: var(--bg-main);
    }
    ::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.25);
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2.5rem 1.5rem 4rem 1.5rem;
    }

    /* Header / Hero Section */
    .hero {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: 2.5rem;
      backdrop-filter: blur(16px);
      box-shadow: var(--shadow);
      margin-bottom: 2.5rem;
      position: relative;
      overflow: hidden;
    }

    .hero::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, var(--accent-indigo), var(--accent-cyan), var(--accent-purple));
    }

    .badge-status {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 1rem;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 9999px;
      color: var(--accent-emerald);
      font-size: 0.85rem;
      font-weight: 600;
      margin-bottom: 1.25rem;
    }

    .pulse-dot {
      width: 8px;
      height: 8px;
      background-color: var(--accent-emerald);
      border-radius: 50%;
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0% {
        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
      }
      70% {
        box-shadow: 0 0 0 8px rgba(16, 185, 129, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
      }
    }

    .hero-title {
      font-size: 2.5rem;
      font-weight: 800;
      letter-spacing: -0.025em;
      margin-bottom: 0.75rem;
      background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .hero-subtitle {
      font-size: 1.1rem;
      color: var(--text-secondary);
      max-width: 700px;
      margin-bottom: 1.75rem;
    }

    .hero-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: center;
    }

    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.85rem 1.75rem;
      background: linear-gradient(135deg, var(--accent-indigo) 0%, var(--accent-purple) 100%);
      color: #ffffff;
      font-weight: 700;
      font-size: 0.95rem;
      border-radius: var(--radius-md);
      text-decoration: none;
      box-shadow: var(--shadow-glow);
      transition: all 0.25s ease;
      border: 1px solid rgba(255, 255, 255, 0.15);
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 0 35px rgba(99, 102, 241, 0.45);
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
    }

    .btn-secondary {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.85rem 1.5rem;
      background: rgba(255, 255, 255, 0.05);
      color: var(--text-primary);
      font-weight: 600;
      font-size: 0.95rem;
      border-radius: var(--radius-md);
      text-decoration: none;
      border: 1px solid var(--border-color);
      transition: all 0.25s ease;
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.2);
    }

    /* System Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.25rem;
      margin-bottom: 2.5rem;
    }

    .stat-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 1.25rem 1.5rem;
      backdrop-filter: blur(12px);
      transition: transform 0.2s ease, border-color 0.2s ease;
    }

    .stat-card:hover {
      transform: translateY(-2px);
      border-color: var(--border-accent);
    }

    .stat-label {
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      font-weight: 600;
      margin-bottom: 0.35rem;
    }

    .stat-value {
      font-size: 1.2rem;
      font-weight: 700;
      color: var(--text-primary);
      font-family: 'JetBrains Mono', monospace;
    }

    /* Documentation Section */
    .section-title {
      font-size: 1.75rem;
      font-weight: 700;
      margin-bottom: 1.5rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .controls-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.75rem;
      background: var(--bg-card);
      padding: 1rem 1.25rem;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-color);
    }

    .search-input {
      flex: 1;
      min-width: 250px;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      padding: 0.65rem 1rem;
      color: var(--text-primary);
      font-family: inherit;
      font-size: 0.9rem;
      outline: none;
      transition: border-color 0.2s;
    }

    .search-input:focus {
      border-color: var(--accent-indigo);
    }

    .filter-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .tab-btn {
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-secondary);
      padding: 0.45rem 0.85rem;
      border-radius: var(--radius-sm);
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .tab-btn:hover {
      color: var(--text-primary);
      background: rgba(255, 255, 255, 0.05);
    }

    .tab-btn.active {
      background: rgba(99, 102, 241, 0.15);
      border-color: rgba(99, 102, 241, 0.3);
      color: var(--accent-indigo);
    }

    /* API Endpoint Cards */
    .endpoint-group {
      margin-bottom: 2rem;
    }

    .group-header {
      font-size: 1.2rem;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 1rem;
      padding-bottom: 0.4rem;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .endpoint-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      margin-bottom: 1rem;
      overflow: hidden;
      transition: all 0.2s ease;
    }

    .endpoint-card:hover {
      border-color: rgba(255, 255, 255, 0.18);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }

    .endpoint-header {
      padding: 1rem 1.25rem;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      cursor: pointer;
      user-select: none;
      background: rgba(255, 255, 255, 0.01);
    }

    .endpoint-path-wrap {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      flex: 1;
      min-width: 280px;
    }

    .method-badge {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
      font-size: 0.75rem;
      padding: 0.25rem 0.6rem;
      border-radius: 4px;
      text-transform: uppercase;
      min-width: 60px;
      text-align: center;
    }

    .method-get { background: rgba(59, 130, 246, 0.15); color: var(--method-get); border: 1px solid rgba(59, 130, 246, 0.3); }
    .method-post { background: rgba(16, 185, 129, 0.15); color: var(--method-post); border: 1px solid rgba(16, 185, 129, 0.3); }
    .method-put { background: rgba(245, 158, 11, 0.15); color: var(--method-put); border: 1px solid rgba(245, 158, 11, 0.3); }
    .method-delete { background: rgba(239, 68, 68, 0.15); color: var(--method-delete); border: 1px solid rgba(239, 68, 68, 0.3); }

    .endpoint-path {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 600;
      font-size: 0.95rem;
      color: var(--text-primary);
    }

    .endpoint-desc {
      font-size: 0.85rem;
      color: var(--text-secondary);
      flex: 2;
      min-width: 250px;
    }

    .endpoint-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-action {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid var(--border-color);
      color: var(--text-secondary);
      padding: 0.35rem 0.65rem;
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      transition: all 0.2s;
      text-decoration: none;
    }

    .btn-action:hover {
      background: rgba(255, 255, 255, 0.12);
      color: var(--text-primary);
    }

    .endpoint-body {
      padding: 1.25rem;
      border-top: 1px solid var(--border-color);
      background: rgba(0, 0, 0, 0.25);
      display: none;
    }

    .endpoint-card.open .endpoint-body {
      display: block;
    }

    .code-block {
      background: #07090e;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      padding: 1rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.825rem;
      color: #e2e8f0;
      overflow-x: auto;
      white-space: pre-wrap;
      margin-top: 0.5rem;
      position: relative;
    }

    .code-title {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 0.35rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .copy-toast {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      background: var(--accent-emerald);
      color: #000;
      padding: 0.75rem 1.25rem;
      border-radius: var(--radius-md);
      font-weight: 700;
      font-size: 0.85rem;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      transform: translateY(100px);
      opacity: 0;
      transition: all 0.3s ease;
      z-index: 1000;
    }

    .copy-toast.show {
      transform: translateY(0);
      opacity: 1;
    }

    footer {
      text-align: center;
      margin-top: 4rem;
      padding-top: 2rem;
      border-top: 1px solid var(--border-color);
      color: var(--text-muted);
      font-size: 0.85rem;
    }

    footer a {
      color: var(--accent-indigo);
      text-decoration: none;
    }

    footer a:hover {
      text-decoration: underline;
    }

    @media (max-width: 768px) {
      .hero-title { font-size: 1.85rem; }
      .hero { padding: 1.5rem; }
      .endpoint-header { flex-direction: column; align-items: flex-start; }
      .endpoint-actions { width: 100%; justify-content: flex-end; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Hero Section -->
    <header class="hero">
      <div class="badge-status">
        <span class="pulse-dot"></span>
        <span>Server Active & Online</span>
      </div>
      <h1 class="hero-title">Personal Portfolio API Hub</h1>
      <p class="hero-subtitle">
        High-performance Node.js / Express backend service powering real-time chat, analytics, scheduling, contact inquiries, and interactive portfolio features.
      </p>
      <div class="hero-actions">
        <a href="${frontendUrl}" class="btn-primary" target="_blank" rel="noopener noreferrer">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
          Launch Frontend App (${frontendUrl})
        </a>
        <a href="/api/health" class="btn-secondary" target="_blank">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          Health Endpoint
        </a>
      </div>
    </header>

    <!-- System Stats Grid -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Environment</div>
        <div class="stat-value" style="color: var(--accent-cyan);">${nodeEnv}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Port</div>
        <div class="stat-value" style="color: var(--accent-purple);">${port}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Rate Limiting</div>
        <div class="stat-value" style="color: var(--accent-emerald);">Disabled (Unlimited)</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Frontend URL</div>
        <div class="stat-value" style="font-size: 0.95rem; word-break: break-all; color: var(--accent-indigo);">${frontendUrl}</div>
      </div>
    </div>

    <!-- API Documentation -->
    <section>
      <h2 class="section-title">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-indigo)" stroke-width="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        API Documentation & Endpoints
      </h2>

      <!-- Controls & Filter Bar -->
      <div class="controls-bar">
        <input type="text" id="searchInput" class="search-input" placeholder="🔍 Search endpoint by path, method or title..." onkeyup="filterEndpoints()">
        <div class="filter-tabs">
          <button class="tab-btn active" onclick="filterCategory('all', this)">All</button>
          <button class="tab-btn" onclick="filterCategory('auth', this)">Auth & 2FA</button>
          <button class="tab-btn" onclick="filterCategory('contact', this)">Contact & Hire</button>
          <button class="tab-btn" onclick="filterCategory('chat', this)">AI Chatbot</button>
          <button class="tab-btn" onclick="filterCategory('meetings', this)">Meetings</button>
          <button class="tab-btn" onclick="filterCategory('analytics', this)">Analytics</button>
        </div>
      </div>

      <!-- Endpoints List -->
      <div id="endpointsContainer">

        <!-- System & Health -->
        <div class="endpoint-group" data-category="system">
          <div class="group-header">⚡ System & Health</div>
          
          <div class="endpoint-card" data-category="system" data-search="health system api server status">
            <div class="endpoint-header" onclick="toggleCard(this)">
              <div class="endpoint-path-wrap">
                <span class="method-badge method-get">GET</span>
                <span class="endpoint-path">/api/health</span>
              </div>
              <div class="endpoint-desc">System health check endpoint</div>
              <div class="endpoint-actions">
                <a href="/api/health" target="_blank" class="btn-action" onclick="event.stopPropagation()">Try</a>
                <button class="btn-action" onclick="copyText('/api/health'); event.stopPropagation();">Copy</button>
              </div>
            </div>
            <div class="endpoint-body">
              <div class="code-title">Sample Response (200 OK):</div>
              <div class="code-block">{
  "success": true,
  "message": "Portfolio API is running",
  "timestamp": "${startTime}",
  "environment": "${nodeEnv}"
}</div>
            </div>
          </div>
        </div>

        <!-- Auth Endpoints -->
        <div class="endpoint-group" data-category="auth">
          <div class="group-header">🔐 Authentication & 2FA</div>
          
          <div class="endpoint-card" data-category="auth" data-search="post /api/auth/login admin 2fa otp login">
            <div class="endpoint-header" onclick="toggleCard(this)">
              <div class="endpoint-path-wrap">
                <span class="method-badge method-post">POST</span>
                <span class="endpoint-path">/api/auth/login</span>
              </div>
              <div class="endpoint-desc">Admin authentication step 1 (Triggers 2FA OTP generation)</div>
              <div class="endpoint-actions">
                <button class="btn-action" onclick="copyText('/api/auth/login'); event.stopPropagation();">Copy</button>
              </div>
            </div>
            <div class="endpoint-body">
              <div class="code-title">Request Body (JSON):</div>
              <div class="code-block">{
  "username": "admin@example.com",
  "password": "your-password"
}</div>
              <div class="code-title" style="margin-top:0.75rem;">Sample Response (200 OK):</div>
              <div class="code-block">{
  "success": true,
  "message": "2FA code sent to your email.",
  "requires2FA": true
}</div>
            </div>
          </div>

          <div class="endpoint-card" data-category="auth" data-search="post /api/auth/verify-2fa verify otp token jwt">
            <div class="endpoint-header" onclick="toggleCard(this)">
              <div class="endpoint-path-wrap">
                <span class="method-badge method-post">POST</span>
                <span class="endpoint-path">/api/auth/verify-2fa</span>
              </div>
              <div class="endpoint-desc">Verify 2FA 6-digit code to receive Admin JWT Bearer Token</div>
              <div class="endpoint-actions">
                <button class="btn-action" onclick="copyText('/api/auth/verify-2fa'); event.stopPropagation();">Copy</button>
              </div>
            </div>
            <div class="endpoint-body">
              <div class="code-title">Request Body (JSON):</div>
              <div class="code-block">{
  "code": "123456"
}</div>
              <div class="code-title" style="margin-top:0.75rem;">Sample Response (200 OK):</div>
              <div class="code-block">{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "message": "Login successful!"
}</div>
            </div>
          </div>

          <div class="endpoint-card" data-category="auth" data-search="post /api/auth/resend-2fa resend otp">
            <div class="endpoint-header" onclick="toggleCard(this)">
              <div class="endpoint-path-wrap">
                <span class="method-badge method-post">POST</span>
                <span class="endpoint-path">/api/auth/resend-2fa</span>
              </div>
              <div class="endpoint-desc">Resend new 2FA code via email or logs</div>
              <div class="endpoint-actions">
                <button class="btn-action" onclick="copyText('/api/auth/resend-2fa'); event.stopPropagation();">Copy</button>
              </div>
            </div>
            <div class="endpoint-body">
              <div class="code-title">Response (200 OK):</div>
              <div class="code-block">{
  "success": true,
  "message": "New 2FA code sent to your email."
}</div>
            </div>
          </div>
        </div>

        <!-- Contact & Hire Endpoints -->
        <div class="endpoint-group" data-category="contact">
          <div class="group-header">📬 Contact & Hire Form Services</div>

          <div class="endpoint-card" data-category="contact" data-search="post /api/contact contact message submit form">
            <div class="endpoint-header" onclick="toggleCard(this)">
              <div class="endpoint-path-wrap">
                <span class="method-badge method-post">POST</span>
                <span class="endpoint-path">/api/contact</span>
              </div>
              <div class="endpoint-desc">Submit contact message form (Unlimited requests)</div>
              <div class="endpoint-actions">
                <button class="btn-action" onclick="copyText('/api/contact'); event.stopPropagation();">Copy</button>
              </div>
            </div>
            <div class="endpoint-body">
              <div class="code-title">Request Body (JSON):</div>
              <div class="code-block">{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "subject": "Project Inquiry",
  "message": "Hello, I would like to discuss a potential project."
}</div>
            </div>
          </div>

          <div class="endpoint-card" data-category="contact" data-search="get /api/contact admin get contacts list">
            <div class="endpoint-header" onclick="toggleCard(this)">
              <div class="endpoint-path-wrap">
                <span class="method-badge method-get">GET</span>
                <span class="endpoint-path">/api/contact</span>
              </div>
              <div class="endpoint-desc">Fetch all submitted contact messages (Requires Admin Bearer Token)</div>
              <div class="endpoint-actions">
                <button class="btn-action" onclick="copyText('/api/contact'); event.stopPropagation();">Copy</button>
              </div>
            </div>
            <div class="endpoint-body">
              <div class="code-title">Header required:</div>
              <div class="code-block">Authorization: Bearer &lt;YOUR_JWT_TOKEN&gt;</div>
            </div>
          </div>

          <div class="endpoint-card" data-category="contact" data-search="post /api/hire hire proposal inquiry project submit">
            <div class="endpoint-header" onclick="toggleCard(this)">
              <div class="endpoint-path-wrap">
                <span class="method-badge method-post">POST</span>
                <span class="endpoint-path">/api/hire</span>
              </div>
              <div class="endpoint-desc">Submit client hiring proposal (Unlimited requests)</div>
              <div class="endpoint-actions">
                <button class="btn-action" onclick="copyText('/api/hire'); event.stopPropagation();">Copy</button>
              </div>
            </div>
            <div class="endpoint-body">
              <div class="code-title">Request Body (JSON):</div>
              <div class="code-block">{
  "name": "Tech Corp",
  "email": "contact@techcorp.com",
  "projectType": "Full-Stack Web App",
  "budget": "$5,000 - $10,000",
  "details": "We need a custom dashboard built."
}</div>
            </div>
          </div>
        </div>

        <!-- AI Chatbot Endpoints -->
        <div class="endpoint-group" data-category="chat">
          <div class="group-header">🤖 AI Chatbot Engine</div>

          <div class="endpoint-card" data-category="chat" data-search="post /api/chat send message ai gemini chatbot prompt">
            <div class="endpoint-header" onclick="toggleCard(this)">
              <div class="endpoint-path-wrap">
                <span class="method-badge method-post">POST</span>
                <span class="endpoint-path">/api/chat</span>
              </div>
              <div class="endpoint-desc">Send message to AI Portfolio Assistant (Unlimited)</div>
              <div class="endpoint-actions">
                <button class="btn-action" onclick="copyText('/api/chat'); event.stopPropagation();">Copy</button>
              </div>
            </div>
            <div class="endpoint-body">
              <div class="code-title">Request Body (JSON):</div>
              <div class="code-block">{
  "message": "What skills and experience do you have in Angular & Node.js?",
  "sessionId": "session_12345"
}</div>
            </div>
          </div>

          <div class="endpoint-card" data-category="chat" data-search="get /api/chat/commands quick chatbot prompt commands">
            <div class="endpoint-header" onclick="toggleCard(this)">
              <div class="endpoint-path-wrap">
                <span class="method-badge method-get">GET</span>
                <span class="endpoint-path">/api/chat/commands</span>
              </div>
              <div class="endpoint-desc">Get pre-configured quick command prompts for the AI Chatbot</div>
              <div class="endpoint-actions">
                <a href="/api/chat/commands" target="_blank" class="btn-action" onclick="event.stopPropagation()">Try</a>
                <button class="btn-action" onclick="copyText('/api/chat/commands'); event.stopPropagation();">Copy</button>
              </div>
            </div>
            <div class="endpoint-body">
              <div class="code-title">Response:</div>
              <div class="code-block">[
  { "command": "/skills", "label": "Technical Skills" },
  { "command": "/projects", "label": "Featured Projects" },
  { "command": "/experience", "label": "Work Experience" }
]</div>
            </div>
          </div>
        </div>

        <!-- Meetings & Availability Endpoints -->
        <div class="endpoint-group" data-category="meetings">
          <div class="group-header">📅 Meetings & Calendar Scheduling</div>

          <div class="endpoint-card" data-category="meetings" data-search="post /api/meetings/schedule schedule meeting book slot">
            <div class="endpoint-header" onclick="toggleCard(this)">
              <div class="endpoint-path-wrap">
                <span class="method-badge method-post">POST</span>
                <span class="endpoint-path">/api/meetings/schedule</span>
              </div>
              <div class="endpoint-desc">Book a meeting slot with the portfolio owner</div>
              <div class="endpoint-actions">
                <button class="btn-action" onclick="copyText('/api/meetings/schedule'); event.stopPropagation();">Copy</button>
              </div>
            </div>
            <div class="endpoint-body">
              <div class="code-title">Request Body (JSON):</div>
              <div class="code-block">{
  "name": "Alex Smith",
  "email": "alex@company.com",
  "date": "2026-08-01",
  "timeSlot": "14:00",
  "topic": "1-on-1 Code Review & Consultation"
}</div>
            </div>
          </div>

          <div class="endpoint-card" data-category="meetings" data-search="get /api/meetings/check-availability check available slots">
            <div class="endpoint-header" onclick="toggleCard(this)">
              <div class="endpoint-path-wrap">
                <span class="method-badge method-get">GET</span>
                <span class="endpoint-path">/api/meetings/check-availability</span>
              </div>
              <div class="endpoint-desc">Check available meeting time slots for a given date</div>
              <div class="endpoint-actions">
                <a href="/api/meetings/check-availability?date=2026-08-01" target="_blank" class="btn-action" onclick="event.stopPropagation()">Try</a>
                <button class="btn-action" onclick="copyText('/api/meetings/check-availability?date=2026-08-01'); event.stopPropagation();">Copy</button>
              </div>
            </div>
            <div class="endpoint-body">
              <div class="code-title">Query Parameters:</div>
              <div class="code-block">?date=YYYY-MM-DD</div>
            </div>
          </div>
        </div>

        <!-- Analytics Endpoints -->
        <div class="endpoint-group" data-category="analytics">
          <div class="group-header">📊 Real-Time Analytics</div>

          <div class="endpoint-card" data-category="analytics" data-search="post /api/analytics/event track event user click">
            <div class="endpoint-header" onclick="toggleCard(this)">
              <div class="endpoint-path-wrap">
                <span class="method-badge method-post">POST</span>
                <span class="endpoint-path">/api/analytics/event</span>
              </div>
              <div class="endpoint-desc">Record client user interaction event</div>
              <div class="endpoint-actions">
                <button class="btn-action" onclick="copyText('/api/analytics/event'); event.stopPropagation();">Copy</button>
              </div>
            </div>
            <div class="endpoint-body">
              <div class="code-title">Request Body (JSON):</div>
              <div class="code-block">{
  "eventType": "page_view",
  "path": "/projects",
  "sessionId": "sess_8892"
}</div>
            </div>
          </div>

          <div class="endpoint-card" data-category="analytics" data-search="get /api/analytics/live live active users analytics">
            <div class="endpoint-header" onclick="toggleCard(this)">
              <div class="endpoint-path-wrap">
                <span class="method-badge method-get">GET</span>
                <span class="endpoint-path">/api/analytics/live</span>
              </div>
              <div class="endpoint-desc">Get current live active visitors counter</div>
              <div class="endpoint-actions">
                <a href="/api/analytics/live" target="_blank" class="btn-action" onclick="event.stopPropagation()">Try</a>
                <button class="btn-action" onclick="copyText('/api/analytics/live'); event.stopPropagation();">Copy</button>
              </div>
            </div>
            <div class="endpoint-body">
              <div class="code-title">Sample Response:</div>
              <div class="code-block">{
  "success": true,
  "activeUsers": 4
}</div>
            </div>
          </div>
        </div>

      </div>
    </section>

    <!-- Toast Notification -->
    <div id="copyToast" class="copyToast">Copied to clipboard!</div>

    <footer>
      <p>Portfolio Backend Service • <a href="${frontendUrl}" target="_blank">Redirect to Frontend (${frontendUrl})</a></p>
    </footer>
  </div>

  <script>
    function toggleCard(headerElement) {
      const card = headerElement.parentElement;
      card.classList.toggle('open');
    }

    function copyText(text) {
      const fullUrl = window.location.origin + text;
      navigator.clipboard.writeText(fullUrl).then(() => {
        const toast = document.getElementById('copyToast');
        toast.textContent = 'Copied endpoint URL: ' + text;
        toast.classList.add('show');
        setTimeout(() => {
          toast.classList.remove('show');
        }, 2200);
      });
    }

    function filterCategory(category, button) {
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      const groups = document.querySelectorAll('.endpoint-group');
      const cards = document.querySelectorAll('.endpoint-card');

      if (category === 'all') {
        groups.forEach(g => g.style.display = 'block');
        cards.forEach(c => c.style.display = 'block');
      } else {
        groups.forEach(g => {
          if (g.getAttribute('data-category') === category) {
            g.style.display = 'block';
          } else {
            g.style.display = 'none';
          }
        });
        cards.forEach(c => {
          if (c.getAttribute('data-category') === category) {
            c.style.display = 'block';
          } else {
            c.style.display = 'none';
          }
        });
      }
    }

    function filterEndpoints() {
      const query = document.getElementById('searchInput').value.toLowerCase();
      const cards = document.querySelectorAll('.endpoint-card');
      const groups = document.querySelectorAll('.endpoint-group');

      cards.forEach(card => {
        const searchData = card.getAttribute('data-search').toLowerCase();
        const textContent = card.textContent.toLowerCase();
        if (searchData.includes(query) || textContent.includes(query)) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });

      groups.forEach(group => {
        const visibleCards = group.querySelectorAll('.endpoint-card[style="display: block;"], .endpoint-card:not([style*="display: none"])');
        if (query && visibleCards.length === 0) {
          group.style.display = 'none';
        } else {
          group.style.display = 'block';
        }
      });
    }
  </script>
</body>
</html>`;
}

module.exports = getLandingPageHtml;
