const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');
const db = require('./db');
const auth = require('./auth');
const { parseMultipart } = require('./multipart');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// MIME Types
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

// JSON response helper
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(data));
}

// Read body helper
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalSize = 0;
    const MAX_SIZE = 25 * 1024 * 1024; // 25 MB max payload

    req.on('data', chunk => {
      totalSize += chunk.length;
      if (totalSize > MAX_SIZE) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    req.on('error', err => reject(err));
  });
}

// Serve static file helper
function serveStaticFile(req, res, filePath) {
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 Not Found');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
}

// Auth middleware helper
function requireAuth(req, res) {
  const token = auth.extractToken(req);
  const session = auth.validateSession(token);
  if (!session) {
    sendJson(res, 401, { error: 'Unauthorized. Please login again.' });
    return null;
  }
  return session;
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const rawPath = parsedUrl.pathname || '/';
  // Normalize trailing slashes (e.g. '/admin/' -> '/admin')
  const pathname = (rawPath.length > 1 && rawPath.endsWith('/')) ? rawPath.slice(0, -1) : rawPath;
  const method = req.method.toUpperCase();

  // CORS headers if needed
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  try {
    // -------------------------------------------------------------
    // API ROUTES
    // -------------------------------------------------------------

    // 1. PUBLIC PORTFOLIO DATA
    if (method === 'GET' && pathname === '/api/portfolio') {
      const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'] || '';
      db.logPageView('/', userAgent, clientIp);

      const settings = db.getSettings();
      const skills = db.getSkills();
      const experiences = db.getExperiences();
      const projects = db.getProjects();

      return sendJson(res, 200, {
        settings,
        skills,
        experiences,
        projects
      });
    }

    // 2. CONTACT FORM SUBMISSION
    if (method === 'POST' && pathname === '/api/contact') {
      const rawBody = await readBody(req);
      let body;
      try {
        body = JSON.parse(rawBody.toString('utf8'));
      } catch (e) {
        return sendJson(res, 400, { error: 'Invalid JSON body' });
      }

      const { name, email, subject, message } = body;
      if (!name || !email || !message) {
        return sendJson(res, 400, { error: 'Name, email, and message are required.' });
      }

      // Basic email check
      if (!email.includes('@') || !email.includes('.')) {
        return sendJson(res, 400, { error: 'Please enter a valid email address.' });
      }

      const created = db.createMessage({
        name: name.trim(),
        email: email.trim(),
        subject: (subject || '').trim(),
        message: message.trim()
      });

      return sendJson(res, 201, {
        success: true,
        message: 'Your message has been sent successfully! I will get back to you soon.',
        id: created.id
      });
    }

    // 3. AUTH: LOGIN
    if (method === 'POST' && pathname === '/api/auth/login') {
      const rawBody = await readBody(req);
      let body;
      try {
        body = JSON.parse(rawBody.toString('utf8'));
      } catch (e) {
        return sendJson(res, 400, { error: 'Invalid JSON body' });
      }

      const { username, password } = body;
      const authData = db.getAuthSettings();

      if (!authData || username !== authData.adminUsername) {
        return sendJson(res, 401, { error: 'Invalid username or password' });
      }

      const isValid = auth.verifyPassword(password, authData.adminPasswordSalt, authData.adminPasswordHash);
      if (!isValid) {
        return sendJson(res, 401, { error: 'Invalid username or password' });
      }

      const { token, expiresAt } = auth.createSession(authData.id);

      // Set cookie
      const cookieVal = `session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`;
      res.setHeader('Set-Cookie', cookieVal);

      return sendJson(res, 200, {
        success: true,
        token,
        expiresAt,
        message: 'Login successful'
      });
    }

    // 4. AUTH: LOGOUT
    if (method === 'POST' && pathname === '/api/auth/logout') {
      const token = auth.extractToken(req);
      auth.deleteSession(token);
      res.setHeader('Set-Cookie', 'session=; Path=/; HttpOnly; Max-Age=0');
      return sendJson(res, 200, { success: true, message: 'Logged out successfully' });
    }

    // 5. AUTH: ME / VERIFY SESSION
    if (method === 'GET' && pathname === '/api/auth/me') {
      const session = requireAuth(req, res);
      if (!session) return;
      return sendJson(res, 200, { authenticated: true, settings: db.getSettings() });
    }

    // -------------------------------------------------------------
    // PROTECTED ADMIN ROUTES
    // -------------------------------------------------------------

    // Admin Dashboard Summary
    if (method === 'GET' && pathname === '/api/admin/dashboard') {
      const session = requireAuth(req, res);
      if (!session) return;

      const stats = db.getAnalyticsStats();
      const recentMessages = db.getMessages().slice(0, 5);
      const settings = db.getSettings();

      return sendJson(res, 200, {
        stats,
        recentMessages,
        settings
      });
    }

    // Admin Update Settings
    if (method === 'POST' && pathname === '/api/admin/settings') {
      const session = requireAuth(req, res);
      if (!session) return;

      const rawBody = await readBody(req);
      let body;
      try {
        body = JSON.parse(rawBody.toString('utf8'));
      } catch (e) {
        return sendJson(res, 400, { error: 'Invalid JSON body' });
      }

      let updated = body;
      if (db && typeof db.updateSettings === 'function') {
        updated = db.updateSettings(body);
      }
      return sendJson(res, 200, { success: true, settings: updated });
    }

    // Admin Update Password
    if (method === 'POST' && pathname === '/api/admin/password') {
      const session = requireAuth(req, res);
      if (!session) return;

      const rawBody = await readBody(req);
      let body;
      try {
        body = JSON.parse(rawBody.toString('utf8'));
      } catch (e) {
        return sendJson(res, 400, { error: 'Invalid JSON body' });
      }

      const { currentPassword, newPassword } = body;
      if (!newPassword || newPassword.length < 6) {
        return sendJson(res, 400, { error: 'New password must be at least 6 characters.' });
      }

      const authData = db.getAuthSettings();
      const isValid = auth.verifyPassword(currentPassword, authData.adminPasswordSalt, authData.adminPasswordHash);
      if (!isValid) {
        return sendJson(res, 400, { error: 'Current password is incorrect.' });
      }

      const newSalt = auth.generateSalt();
      const newHash = auth.hashPassword(newPassword, newSalt);
      db.updatePassword(newSalt, newHash);

      return sendJson(res, 200, { success: true, message: 'Password updated successfully!' });
    }

    // Admin File Upload (Avatar, Resume, Project Image)
    if (method === 'POST' && pathname === '/api/admin/upload') {
      const session = requireAuth(req, res);
      if (!session) return;

      const contentType = req.headers['content-type'] || '';
      const boundaryMatch = contentType.match(/boundary=([^;]+)/i);
      if (!boundaryMatch) {
        return sendJson(res, 400, { error: 'Content-Type must be multipart/form-data with boundary' });
      }

      const rawBody = await readBody(req);
      const parsed = parseMultipart(rawBody, boundaryMatch[1].trim());

      const fileKeys = Object.keys(parsed.files);
      if (fileKeys.length === 0) {
        return sendJson(res, 400, { error: 'No file uploaded' });
      }

      const file = parsed.files[fileKeys[0]];
      const fileExt = path.extname(file.filename).toLowerCase() || '.bin';
      
      // Generate clean, safe filename
      const safePrefix = (parsed.fields.type || 'file').replace(/[^a-z0-9_-]/gi, '');
      const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(4).toString('hex');
      const savedFileName = `${safePrefix}-${uniqueSuffix}${fileExt}`;
      const savedFilePath = path.join(UPLOADS_DIR, savedFileName);

      let fileUrl;
      try {
        if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        fs.writeFileSync(savedFilePath, file.data);
        fileUrl = `/uploads/${savedFileName}`;
      } catch (writeErr) {
        // Read-only serverless environment (e.g. Vercel) -> Convert to Base64 Data URI
        const mime = file.contentType || (fileExt === '.png' ? 'image/png' : fileExt === '.jpg' || fileExt === '.jpeg' ? 'image/jpeg' : fileExt === '.pdf' ? 'application/pdf' : 'application/octet-stream');
        fileUrl = `data:${mime};base64,${file.data.toString('base64')}`;

        // Also try saving to /tmp for downloads if available
        try {
          const tmpUploadPath = path.join('/tmp', savedFileName);
          fs.writeFileSync(tmpUploadPath, file.data);
        } catch (e) {}
      }

      // If upload was specifically for avatar or resume, update settings automatically
      if (parsed.fields.type === 'avatar') {
        if (db && typeof db.updateSettings === 'function') {
          db.updateSettings({ avatarUrl: fileUrl });
        }
      } else if (parsed.fields.type === 'resume') {
        if (db && typeof db.updateSettings === 'function') {
          db.updateSettings({ resumeUrl: fileUrl });
        }
      }

      return sendJson(res, 200, {
        success: true,
        url: fileUrl,
        filename: savedFileName,
        originalName: file.filename,
        size: file.size
      });
    }

    // Admin Projects CRUD
    if (pathname === '/api/admin/projects') {
      const session = requireAuth(req, res);
      if (!session) return;

      if (method === 'GET') {
        return sendJson(res, 200, db.getProjects());
      }
      if (method === 'POST') {
        const rawBody = await readBody(req);
        const body = JSON.parse(rawBody.toString('utf8'));
        const created = db.createProject(body);
        return sendJson(res, 201, created);
      }
    }

    const projectMatch = pathname.match(/^\/api\/admin\/projects\/(\d+)$/);
    if (projectMatch) {
      const session = requireAuth(req, res);
      if (!session) return;
      const id = parseInt(projectMatch[1], 10);

      if (method === 'PUT') {
        const rawBody = await readBody(req);
        const body = JSON.parse(rawBody.toString('utf8'));
        const updated = db.updateProject(id, body);
        return sendJson(res, 200, updated);
      }
      if (method === 'DELETE') {
        db.deleteProject(id);
        return sendJson(res, 200, { success: true, id });
      }
    }

    // Admin Skills CRUD
    if (pathname === '/api/admin/skills') {
      const session = requireAuth(req, res);
      if (!session) return;

      if (method === 'GET') {
        return sendJson(res, 200, db.getSkills());
      }
      if (method === 'POST') {
        const rawBody = await readBody(req);
        const body = JSON.parse(rawBody.toString('utf8'));
        const created = db.createSkill(body);
        return sendJson(res, 201, created);
      }
    }

    const skillMatch = pathname.match(/^\/api\/admin\/skills\/(\d+)$/);
    if (skillMatch) {
      const session = requireAuth(req, res);
      if (!session) return;
      const id = parseInt(skillMatch[1], 10);

      if (method === 'PUT') {
        const rawBody = await readBody(req);
        const body = JSON.parse(rawBody.toString('utf8'));
        const updated = db.updateSkill(id, body);
        return sendJson(res, 200, updated);
      }
      if (method === 'DELETE') {
        db.deleteSkill(id);
        return sendJson(res, 200, { success: true, id });
      }
    }

    // Admin Experiences CRUD
    if (pathname === '/api/admin/experiences') {
      const session = requireAuth(req, res);
      if (!session) return;

      if (method === 'GET') {
        return sendJson(res, 200, db.getExperiences());
      }
      if (method === 'POST') {
        const rawBody = await readBody(req);
        const body = JSON.parse(rawBody.toString('utf8'));
        const created = db.createExperience(body);
        return sendJson(res, 201, created);
      }
    }

    const expMatch = pathname.match(/^\/api\/admin\/experiences\/(\d+)$/);
    if (expMatch) {
      const session = requireAuth(req, res);
      if (!session) return;
      const id = parseInt(expMatch[1], 10);

      if (method === 'PUT') {
        const rawBody = await readBody(req);
        const body = JSON.parse(rawBody.toString('utf8'));
        const updated = db.updateExperience(id, body);
        return sendJson(res, 200, updated);
      }
      if (method === 'DELETE') {
        db.deleteExperience(id);
        return sendJson(res, 200, { success: true, id });
      }
    }

    // Admin Messages CRUD
    if (pathname === '/api/admin/messages') {
      const session = requireAuth(req, res);
      if (!session) return;

      if (method === 'GET') {
        return sendJson(res, 200, db.getMessages());
      }
    }

    const msgReadMatch = pathname.match(/^\/api\/admin\/messages\/(\d+)\/read$/);
    if (msgReadMatch && method === 'PUT') {
      const session = requireAuth(req, res);
      if (!session) return;
      const id = parseInt(msgReadMatch[1], 10);
      db.markMessageRead(id, 1);
      return sendJson(res, 200, { success: true, id });
    }

    const msgDeleteMatch = pathname.match(/^\/api\/admin\/messages\/(\d+)$/);
    if (msgDeleteMatch && method === 'DELETE') {
      const session = requireAuth(req, res);
      if (!session) return;
      const id = parseInt(msgDeleteMatch[1], 10);
      db.deleteMessage(id);
      return sendJson(res, 200, { success: true, id });
    }

    // -------------------------------------------------------------
    // STATIC FILE SERVING
    // -------------------------------------------------------------

    // 1. Uploads directory (/uploads/...)
    if (pathname.startsWith('/uploads/')) {
      const relativePath = pathname.substring('/uploads/'.length);
      const safePath = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, '');
      const fullPath = path.join(UPLOADS_DIR, safePath);
      if (fs.existsSync(fullPath)) {
        return serveStaticFile(req, res, fullPath);
      }
      const pubPath = path.join(PUBLIC_DIR, 'uploads', safePath);
      if (fs.existsSync(pubPath)) {
        return serveStaticFile(req, res, pubPath);
      }
    }

    // 2. HTML Page routes
    if (pathname === '' || pathname === '/' || pathname === '/index' || pathname === '/index.html') {
      return serveStaticFile(req, res, path.join(PUBLIC_DIR, 'index.html'));
    }
    if (pathname === '/admin' || pathname === '/admin.html' || pathname.startsWith('/admin')) {
      return serveStaticFile(req, res, path.join(PUBLIC_DIR, 'admin.html'));
    }
    if (pathname === '/login' || pathname === '/login.html' || pathname.startsWith('/login')) {
      return serveStaticFile(req, res, path.join(PUBLIC_DIR, 'login.html'));
    }

    // 3. Static assets (/css/..., /js/..., /data/..., /assets/...)
    const safeRel = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
    const candidatePath = path.join(PUBLIC_DIR, safeRel);
    if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
      return serveStaticFile(req, res, candidatePath);
    }
    const rootPath = path.join(__dirname, safeRel);
    if (fs.existsSync(rootPath) && fs.statSync(rootPath).isFile()) {
      return serveStaticFile(req, res, rootPath);
    }

    // Fallback: serve index.html
    return serveStaticFile(req, res, path.join(PUBLIC_DIR, 'index.html'));

  } catch (err) {
    console.error('Server error:', err);
    sendJson(res, 500, { error: 'Internal server error: ' + err.message });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🚀 Portfolio & Admin CMS Server running!`);
  console.log(`🌐 Public Portfolio:  http://localhost:${PORT}/`);
  console.log(`🔒 Admin Dashboard:  http://localhost:${PORT}/admin`);
  console.log(`🔑 Admin Login:      http://localhost:${PORT}/login`);
  console.log(`Default Credentials: Username: admin | Password: admin123`);
  console.log(`====================================================`);
});
