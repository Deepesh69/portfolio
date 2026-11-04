const path = require('path');
const fs = require('fs');
const { generateSalt, hashPassword } = require('./auth');

// Determine appropriate DB path (use /tmp on Vercel / serverless containers)
let dbPath = path.join(__dirname, 'portfolio.db');
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || __dirname.startsWith('/var/task');

if (isServerless) {
  try {
    const tmpPath = path.join('/tmp', 'portfolio.db');
    if (!fs.existsSync(tmpPath) && fs.existsSync(dbPath)) {
      try { fs.copyFileSync(dbPath, tmpPath); } catch (e) {}
    }
    dbPath = tmpPath;
  } catch (e) {
    console.warn('Could not setup /tmp database:', e.message);
  }
}

// Memory fallback store (initialized from portfolio.json if available)
let memoryStore = {
  settings: {
    id: 1,
    fullName: 'Dipesh Bista',
    title: 'MSc IT Student & Technical Support Specialist',
    headline: 'Delivering dependable IT solutions, troubleshooting enterprise systems, and bridging technology with business.',
    bio: 'Reliable, detail-oriented IT professional with a solid foundation in Computer Applications and currently pursuing a Master of Science in Information Technology at the University of the West of Scotland.',
    avatarUrl: '/uploads/avatar.jpg',
    resumeUrl: '/uploads/resume.pdf',
    email: 'dipeshbista2009@gmail.com',
    phone: '+44 7918982511',
    location: 'Glasgow, Scotland, UK',
    availability: 'Available for part-time work (up to 20 hours per week) during term time',
    linkedinUrl: 'https://linkedin.com/in/dipesh-bista-28b67619a',
    githubUrl: 'https://github.com',
    websiteUrl: '',
    accentColor: '#4f46e5',
    siteTitle: 'Dipesh Bista | IT Specialist & MSc Candidate',
    metaDescription: 'Professional portfolio of Dipesh Bista - MSc in IT student, Technical Support Specialist, and IT Solutions Professional based in Glasgow.',
    adminUsername: 'admin',
    adminPasswordSalt: '',
    adminPasswordHash: ''
  },
  skills: [],
  experiences: [],
  projects: [],
  messages: [],
  sessions: new Map()
};

// Try loading default json into memoryStore
try {
  const jsonPath = path.join(__dirname, 'public', 'data', 'portfolio.json');
  if (fs.existsSync(jsonPath)) {
    const pData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    if (pData.settings) memoryStore.settings = { ...memoryStore.settings, ...pData.settings };
    if (pData.skills) memoryStore.skills = pData.skills;
    if (pData.experiences) memoryStore.experiences = pData.experiences;
    if (pData.projects) memoryStore.projects = pData.projects;
  }
} catch (e) {}

let db = null;
let useSqlite = false;

try {
  const { DatabaseSync } = require('node:sqlite');
  db = new DatabaseSync(dbPath);
  initDb();
  useSqlite = true;
} catch (err) {
  console.warn('SQLite init warning (using in-memory fallback):', err.message);
  useSqlite = false;
}

// Initialize Tables
function initDb() {
  if (!db) return;
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        fullName TEXT NOT NULL,
        title TEXT NOT NULL,
        headline TEXT,
        bio TEXT,
        avatarUrl TEXT,
        resumeUrl TEXT,
        email TEXT,
        phone TEXT,
        location TEXT,
        availability TEXT,
        linkedinUrl TEXT,
        githubUrl TEXT,
        websiteUrl TEXT,
        accentColor TEXT DEFAULT '#4f46e5',
        siteTitle TEXT,
        metaDescription TEXT,
        adminUsername TEXT DEFAULT 'admin',
        adminPasswordSalt TEXT,
        adminPasswordHash TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS skills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        proficiency INTEGER DEFAULT 80,
        icon TEXT DEFAULT 'code',
        displayOrder INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS experiences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        role TEXT NOT NULL,
        organization TEXT NOT NULL,
        location TEXT,
        startDate TEXT NOT NULL,
        endDate TEXT NOT NULL,
        description TEXT,
        displayOrder INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        tags TEXT,
        imageUrl TEXT,
        demoUrl TEXT,
        githubUrl TEXT,
        featured INTEGER DEFAULT 1,
        displayOrder INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        subject TEXT,
        message TEXT NOT NULL,
        isRead INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        page TEXT DEFAULT '/',
        userAgent TEXT,
        ip TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        userId INTEGER DEFAULT 1,
        expiresAt INTEGER
      );
    `);

    // Check if settings table has row 1; if not, seed default data
    const existingSettings = db.prepare('SELECT id FROM settings WHERE id = 1').get();
    if (!existingSettings) {
      const salt = generateSalt();
      const defaultPasswordHash = hashPassword('admin123', salt);

      const insertSettings = db.prepare(`
        INSERT INTO settings (
          id, fullName, title, headline, bio,
          avatarUrl, resumeUrl, email, phone, location,
          availability, linkedinUrl, githubUrl, websiteUrl,
          accentColor, siteTitle, metaDescription,
          adminUsername, adminPasswordSalt, adminPasswordHash
        ) VALUES (
          1, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?
        )
      `);

      insertSettings.run(
        memoryStore.settings.fullName,
        memoryStore.settings.title,
        memoryStore.settings.headline,
        memoryStore.settings.bio,
        memoryStore.settings.avatarUrl,
        memoryStore.settings.resumeUrl,
        memoryStore.settings.email,
        memoryStore.settings.phone,
        memoryStore.settings.location,
        memoryStore.settings.availability,
        memoryStore.settings.linkedinUrl,
        memoryStore.settings.githubUrl,
        memoryStore.settings.websiteUrl,
        memoryStore.settings.accentColor,
        memoryStore.settings.siteTitle,
        memoryStore.settings.metaDescription,
        'admin',
        salt,
        defaultPasswordHash
      );

      // Seed Skills
      const insertSkill = db.prepare('INSERT INTO skills (name, category, proficiency, icon, displayOrder) VALUES (?, ?, ?, ?, ?)');
      (memoryStore.skills || []).forEach((s, idx) => {
        insertSkill.run(s.name, s.category, s.proficiency || 80, s.icon || 'star', idx);
      });

      // Seed Experiences
      const insertExp = db.prepare(`
        INSERT INTO experiences (type, role, organization, location, startDate, endDate, description, displayOrder)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      (memoryStore.experiences || []).forEach(exp => {
        insertExp.run(exp.type, exp.role, exp.organization, exp.location, exp.startDate, exp.endDate, exp.description, exp.displayOrder || 0);
      });

      // Seed Projects
      const insertProj = db.prepare(`
        INSERT INTO projects (title, category, description, tags, imageUrl, demoUrl, githubUrl, featured, displayOrder)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      (memoryStore.projects || []).forEach(p => {
        insertProj.run(p.title, p.category, p.description, p.tags, p.imageUrl, p.demoUrl, p.githubUrl, p.featured ? 1 : 0, p.displayOrder || 0);
      });
    }
  } catch (err) {
    console.warn('initDb error (continuing with memory):', err.message);
  }
}

function syncStaticJson() {
  try {
    const dataDir = path.join(__dirname, 'public', 'data');
    if (!fs.existsSync(dataDir)) {
      try { fs.mkdirSync(dataDir, { recursive: true }); } catch (e) {}
    }
    const settings = module.exports.getSettings();
    const payload = {
      settings,
      skills: module.exports.getSkills(),
      experiences: module.exports.getExperiences(),
      projects: module.exports.getProjects()
    };
    fs.writeFileSync(path.join(dataDir, 'portfolio.json'), JSON.stringify(payload, null, 2));
    const rootData = path.join(__dirname, 'data');
    if (fs.existsSync(rootData)) {
      try { fs.writeFileSync(path.join(rootData, 'portfolio.json'), JSON.stringify(payload, null, 2)); } catch (e) {}
    }
  } catch (err) {
    // Read-only filesystem warning ignored
  }
}

// Module Exports - Guaranteed to ALWAYS export functions
module.exports = {
  db,
  syncStaticJson,
  getSettings: () => {
    if (useSqlite && db) {
      try {
        const s = db.prepare('SELECT * FROM settings WHERE id = 1').get();
        if (s) {
          const { adminPasswordHash, adminPasswordSalt, ...publicSettings } = s;
          return publicSettings;
        }
      } catch (e) {}
    }
    const { adminPasswordHash, adminPasswordSalt, ...publicSettings } = memoryStore.settings;
    return publicSettings;
  },
  getAuthSettings: () => {
    if (useSqlite && db) {
      try {
        const res = db.prepare('SELECT id, adminUsername, adminPasswordSalt, adminPasswordHash FROM settings WHERE id = 1').get();
        if (res) return res;
      } catch (e) {}
    }
    return {
      id: 1,
      adminUsername: 'admin',
      adminPasswordSalt: memoryStore.settings.adminPasswordSalt || '',
      adminPasswordHash: memoryStore.settings.adminPasswordHash || ''
    };
  },
  updateSettings: (data) => {
    const allowed = [
      'fullName', 'title', 'headline', 'bio', 'avatarUrl', 'resumeUrl',
      'email', 'phone', 'location', 'availability', 'linkedinUrl',
      'githubUrl', 'websiteUrl', 'accentColor', 'siteTitle', 'metaDescription'
    ];

    // Always update memoryStore
    allowed.forEach(k => {
      if (data[k] !== undefined) memoryStore.settings[k] = data[k];
    });

    if (useSqlite && db) {
      try {
        const updates = [];
        const values = [];
        for (const key of allowed) {
          if (data[key] !== undefined) {
            updates.push(`${key} = ?`);
            values.push(data[key]);
          }
        }
        if (updates.length > 0) {
          updates.push("updated_at = CURRENT_TIMESTAMP");
          const sql = `UPDATE settings SET ${updates.join(', ')} WHERE id = 1`;
          db.prepare(sql).run(...values);
        }
      } catch (e) {
        console.warn('SQLite updateSettings failed:', e.message);
      }
    }

    syncStaticJson();
    return module.exports.getSettings();
  },
  updatePassword: (newSalt, newHash) => {
    memoryStore.settings.adminPasswordSalt = newSalt;
    memoryStore.settings.adminPasswordHash = newHash;
    if (useSqlite && db) {
      try {
        db.prepare('UPDATE settings SET adminPasswordSalt = ?, adminPasswordHash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1').run(newSalt, newHash);
      } catch (e) {}
    }
  },
  // Projects
  getProjects: () => {
    if (useSqlite && db) {
      try {
        return db.prepare('SELECT * FROM projects ORDER BY displayOrder ASC, id DESC').all();
      } catch (e) {}
    }
    return memoryStore.projects || [];
  },
  getProjectById: (id) => {
    if (useSqlite && db) {
      try {
        return db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
      } catch (e) {}
    }
    return (memoryStore.projects || []).find(p => p.id === id);
  },
  createProject: (data) => {
    const p = {
      id: Date.now(),
      title: data.title || 'Untitled Project',
      category: data.category || 'General',
      description: data.description || '',
      tags: data.tags || '',
      imageUrl: data.imageUrl || '',
      demoUrl: data.demoUrl || '',
      githubUrl: data.githubUrl || '',
      featured: data.featured ? 1 : 0,
      displayOrder: data.displayOrder || 0
    };
    memoryStore.projects = [p, ...(memoryStore.projects || [])];

    if (useSqlite && db) {
      try {
        const stmt = db.prepare(`
          INSERT INTO projects (title, category, description, tags, imageUrl, demoUrl, githubUrl, featured, displayOrder)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const info = stmt.run(p.title, p.category, p.description, p.tags, p.imageUrl, p.demoUrl, p.githubUrl, p.featured, p.displayOrder);
        p.id = info.lastInsertRowid;
      } catch (e) {}
    }
    syncStaticJson();
    return p;
  },
  updateProject: (id, data) => {
    let p = (memoryStore.projects || []).find(x => x.id === id);
    if (p) Object.assign(p, data);

    if (useSqlite && db) {
      try {
        const stmt = db.prepare(`
          UPDATE projects SET
            title = ?, category = ?, description = ?, tags = ?,
            imageUrl = ?, demoUrl = ?, githubUrl = ?, featured = ?, displayOrder = ?
          WHERE id = ?
        `);
        stmt.run(data.title, data.category, data.description, data.tags, data.imageUrl, data.demoUrl, data.githubUrl, data.featured ? 1 : 0, data.displayOrder || 0, id);
      } catch (e) {}
    }
    syncStaticJson();
    return p || data;
  },
  deleteProject: (id) => {
    memoryStore.projects = (memoryStore.projects || []).filter(x => x.id !== id);
    if (useSqlite && db) {
      try { db.prepare('DELETE FROM projects WHERE id = ?').run(id); } catch (e) {}
    }
    syncStaticJson();
  },
  // Skills
  getSkills: () => {
    if (useSqlite && db) {
      try {
        return db.prepare('SELECT * FROM skills ORDER BY displayOrder ASC, id ASC').all();
      } catch (e) {}
    }
    return memoryStore.skills || [];
  },
  createSkill: (data) => {
    const s = {
      id: Date.now(),
      name: data.name,
      category: data.category || 'General',
      proficiency: data.proficiency || 80,
      icon: data.icon || 'star',
      displayOrder: data.displayOrder || 0
    };
    memoryStore.skills = [...(memoryStore.skills || []), s];
    if (useSqlite && db) {
      try {
        const info = db.prepare('INSERT INTO skills (name, category, proficiency, icon, displayOrder) VALUES (?, ?, ?, ?, ?)').run(s.name, s.category, s.proficiency, s.icon, s.displayOrder);
        s.id = info.lastInsertRowid;
      } catch (e) {}
    }
    syncStaticJson();
    return s;
  },
  updateSkill: (id, data) => {
    let s = (memoryStore.skills || []).find(x => x.id === id);
    if (s) Object.assign(s, data);
    if (useSqlite && db) {
      try {
        db.prepare('UPDATE skills SET name = ?, category = ?, proficiency = ?, icon = ?, displayOrder = ? WHERE id = ?')
          .run(data.name, data.category, data.proficiency, data.icon, data.displayOrder || 0, id);
      } catch (e) {}
    }
    syncStaticJson();
    return s || data;
  },
  deleteSkill: (id) => {
    memoryStore.skills = (memoryStore.skills || []).filter(x => x.id !== id);
    if (useSqlite && db) {
      try { db.prepare('DELETE FROM skills WHERE id = ?').run(id); } catch (e) {}
    }
    syncStaticJson();
  },
  // Experiences
  getExperiences: () => {
    if (useSqlite && db) {
      try {
        return db.prepare('SELECT * FROM experiences ORDER BY displayOrder ASC, id DESC').all();
      } catch (e) {}
    }
    return memoryStore.experiences || [];
  },
  createExperience: (data) => {
    const exp = {
      id: Date.now(),
      type: data.type || 'work',
      role: data.role,
      organization: data.organization,
      location: data.location || '',
      startDate: data.startDate,
      endDate: data.endDate,
      description: data.description || '',
      displayOrder: data.displayOrder || 0
    };
    memoryStore.experiences = [exp, ...(memoryStore.experiences || [])];
    if (useSqlite && db) {
      try {
        const stmt = db.prepare(`
          INSERT INTO experiences (type, role, organization, location, startDate, endDate, description, displayOrder)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const info = stmt.run(exp.type, exp.role, exp.organization, exp.location, exp.startDate, exp.endDate, exp.description, exp.displayOrder);
        exp.id = info.lastInsertRowid;
      } catch (e) {}
    }
    syncStaticJson();
    return exp;
  },
  updateExperience: (id, data) => {
    let exp = (memoryStore.experiences || []).find(x => x.id === id);
    if (exp) Object.assign(exp, data);
    if (useSqlite && db) {
      try {
        db.prepare(`
          UPDATE experiences SET
            type = ?, role = ?, organization = ?, location = ?,
            startDate = ?, endDate = ?, description = ?, displayOrder = ?
          WHERE id = ?
        `).run(data.type, data.role, data.organization, data.location || '', data.startDate, data.endDate, data.description || '', data.displayOrder || 0, id);
      } catch (e) {}
    }
    syncStaticJson();
    return exp || data;
  },
  deleteExperience: (id) => {
    memoryStore.experiences = (memoryStore.experiences || []).filter(x => x.id !== id);
    if (useSqlite && db) {
      try { db.prepare('DELETE FROM experiences WHERE id = ?').run(id); } catch (e) {}
    }
    syncStaticJson();
  },
  // Messages
  getMessages: () => {
    if (useSqlite && db) {
      try {
        return db.prepare('SELECT * FROM messages ORDER BY id DESC').all();
      } catch (e) {}
    }
    return memoryStore.messages || [];
  },
  getMessageById: (id) => {
    return (memoryStore.messages || []).find(m => m.id === id);
  },
  createMessage: (data) => {
    const msg = {
      id: Date.now(),
      name: data.name,
      email: data.email,
      subject: data.subject || '',
      message: data.message,
      isRead: 0,
      created_at: new Date().toISOString()
    };
    memoryStore.messages = [msg, ...(memoryStore.messages || [])];
    if (useSqlite && db) {
      try {
        const stmt = db.prepare('INSERT INTO messages (name, email, subject, message) VALUES (?, ?, ?, ?)');
        const info = stmt.run(data.name, data.email, data.subject || '', data.message);
        msg.id = info.lastInsertRowid;
      } catch (e) {}
    }
    return msg;
  },
  markMessageRead: (id, isRead = 1) => {
    const m = (memoryStore.messages || []).find(x => x.id === id);
    if (m) m.isRead = isRead ? 1 : 0;
    if (useSqlite && db) {
      try { db.prepare('UPDATE messages SET isRead = ? WHERE id = ?').run(isRead ? 1 : 0, id); } catch (e) {}
    }
  },
  deleteMessage: (id) => {
    memoryStore.messages = (memoryStore.messages || []).filter(x => x.id !== id);
    if (useSqlite && db) {
      try { db.prepare('DELETE FROM messages WHERE id = ?').run(id); } catch (e) {}
    }
  },
  logPageView: (page, userAgent, ip) => {
    if (useSqlite && db) {
      try {
        db.prepare('INSERT INTO analytics (page, userAgent, ip) VALUES (?, ?, ?)').run(page, userAgent || '', ip || '');
      } catch (e) {}
    }
  },
  getAnalyticsStats: () => {
    let totalViews = 1, todayViews = 1, totalMessages = 0, unreadMessages = 0;
    if (useSqlite && db) {
      try {
        totalViews = db.prepare('SELECT COUNT(*) as count FROM analytics').get().count;
        todayViews = db.prepare("SELECT COUNT(*) as count FROM analytics WHERE date(timestamp) = date('now')").get().count;
        totalMessages = db.prepare('SELECT COUNT(*) as count FROM messages').get().count;
        unreadMessages = db.prepare('SELECT COUNT(*) as count FROM messages WHERE isRead = 0').get().count;
      } catch (e) {}
    } else {
      totalMessages = (memoryStore.messages || []).length;
      unreadMessages = (memoryStore.messages || []).filter(m => !m.isRead).length;
    }
    return {
      totalViews,
      todayViews,
      totalMessages,
      unreadMessages,
      totalProjects: (module.exports.getProjects() || []).length,
      totalSkills: (module.exports.getSkills() || []).length
    };
  },
  // Sessions
  saveSession: (token, userId = 1, expiresAt) => {
    memoryStore.sessions.set(token, { userId, expiresAt });
    if (useSqlite && db) {
      try {
        db.prepare('INSERT OR REPLACE INTO sessions (token, userId, expiresAt) VALUES (?, ?, ?)').run(token, userId, expiresAt);
      } catch (e) {}
    }
  },
  findSession: (token) => {
    if (useSqlite && db) {
      try {
        const found = db.prepare('SELECT * FROM sessions WHERE token = ?').get(token);
        if (found) return found;
      } catch (e) {}
    }
    return memoryStore.sessions.get(token);
  },
  removeSession: (token) => {
    memoryStore.sessions.delete(token);
    if (useSqlite && db) {
      try { db.prepare('DELETE FROM sessions WHERE token = ?').run(token); } catch (e) {}
    }
  }
};
