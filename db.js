const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const { generateSalt, hashPassword } = require('./auth');

const dbPath = path.join(__dirname, 'portfolio.db');
const db = new DatabaseSync(dbPath);

// Initialize Tables
function initDb() {
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
      type TEXT NOT NULL, -- 'work' or 'education'
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
      'Dipesh Bista',
      'MSc IT Student & Technical Support Specialist',
      'Delivering dependable IT solutions, troubleshooting enterprise systems, and bridging technology with business.',
      'Reliable, detail-oriented IT professional with a solid foundation in Computer Applications and currently pursuing a Master of Science in Information Technology at the University of the West of Scotland. Experienced in technical support, accounting software troubleshooting, system diagnostics, and customer relationship building. Proven ability to work effectively in fast-paced environments and collaborate with development teams to solve complex technical problems.',
      '/uploads/avatar.jpg',
      '/uploads/resume.pdf',
      'dipeshbista2009@gmail.com',
      '+44 7918982511',
      'Glasgow, Scotland, UK',
      'Available for part-time work (up to 20 hours per week) during term time',
      'https://linkedin.com/in/dipesh-bista-28b67619a',
      'https://github.com',
      '',
      '#4f46e5',
      'Dipesh Bista | IT Specialist & MSc Candidate',
      'Professional portfolio of Dipesh Bista - MSc in IT student, Technical Support Specialist, and IT Solutions Professional based in Glasgow.',
      'admin',
      salt,
      defaultPasswordHash
    );

    // Seed Skills
    const seedSkills = [
      { name: 'Accounting & Financial Software', category: 'Technical Skills', proficiency: 95, icon: 'calculator' },
      { name: 'MS Excel (Advanced, Formulas, Pivot)', category: 'Technical Skills', proficiency: 92, icon: 'table' },
      { name: 'IT Helpdesk & System Troubleshooting', category: 'Technical Skills', proficiency: 90, icon: 'wrench' },
      { name: 'Data Entry, Audit & Reporting', category: 'Technical Skills', proficiency: 88, icon: 'file-text' },
      { name: 'Database & Records Administration', category: 'Technical Skills', proficiency: 85, icon: 'database' },
      { name: 'Hardware & OS Configuration', category: 'Technical Skills', proficiency: 80, icon: 'cpu' },

      { name: 'Customer Service & User Training', category: 'Core Competencies', proficiency: 95, icon: 'users' },
      { name: 'Communication & Relationship Building', category: 'Core Competencies', proficiency: 92, icon: 'message-circle' },
      { name: 'Time Management & Meeting Deadlines', category: 'Core Competencies', proficiency: 94, icon: 'clock' },
      { name: 'Cross-functional Collaboration (R&D)', category: 'Core Competencies', proficiency: 90, icon: 'git-merge' },
      { name: 'Problem Diagnostics & Root Cause Analysis', category: 'Core Competencies', proficiency: 88, icon: 'search' }
    ];

    const insertSkill = db.prepare('INSERT INTO skills (name, category, proficiency, icon, displayOrder) VALUES (?, ?, ?, ?, ?)');
    seedSkills.forEach((s, idx) => {
      insertSkill.run(s.name, s.category, s.proficiency, s.icon, idx);
    });

    // Seed Experiences
    const seedExperiences = [
      {
        type: 'education',
        role: 'Master of Science in Information Technology',
        organization: 'University of the West of Scotland (UWS)',
        location: 'Glasgow, United Kingdom',
        startDate: '2025',
        endDate: 'Present',
        description: 'Postgraduate studies focusing on enterprise information systems, cloud infrastructure, network architectures, advanced software technologies, and data management.',
        displayOrder: 0
      },
      {
        type: 'education',
        role: 'Bachelor in Computer Application (BCA)',
        organization: 'Times International College',
        location: 'Kathmandu, Nepal',
        startDate: '2020',
        endDate: '2025',
        description: 'Comprehensive study of computing paradigms, software engineering, database management systems, web development, data structures, and computer networking.',
        displayOrder: 1
      },
      {
        type: 'work',
        role: 'Customer & Technical Support Specialist',
        organization: 'Sagar International Computech Pvt. Ltd.',
        location: 'Kathmandu, Nepal',
        startDate: 'Jan 2021',
        endDate: 'Nov 2025',
        description: '• Diagnosed and resolved software, database, and operational issues for accounting and business software users.\n• Conducted interactive training sessions on accounting software for client teams and internal staff.\n• Coordinated closely with the Resource and Development (R&D) team to report system bugs and deploy updates.\n• Maintained detailed customer documentation and financial system records with 100% compliance.',
        displayOrder: 2
      },
      {
        type: 'work',
        role: 'Accountant',
        organization: 'Mahabharat Metals Pvt Ltd.',
        location: 'Nepal',
        startDate: 'Oct 2019',
        endDate: 'Jun 2020',
        description: '• Managed daily ledger accounts, supplier invoices, and core financial records.\n• Performed inventory costing, stock reconciliations, and vendor statement matching.\n• Supported internal and external audits with comprehensive variance reports.',
        displayOrder: 3
      },
      {
        type: 'work',
        role: 'Junior Accountant',
        organization: 'Greenline Tours Pvt. Ltd.',
        location: 'Nepal',
        startDate: 'Nov 2018',
        endDate: 'Sep 2019',
        description: '• Handled accounts payable and accounts receivable cycles with high accuracy.\n• Prepared periodic trial balances, invoice generation, and customer payment tracking.\n• Assisted senior accountants in month-end financial closing and tax compliance preparation.',
        displayOrder: 4
      }
    ];

    const insertExp = db.prepare(`
      INSERT INTO experiences (type, role, organization, location, startDate, endDate, description, displayOrder)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    seedExperiences.forEach(exp => {
      insertExp.run(exp.type, exp.role, exp.organization, exp.location, exp.startDate, exp.endDate, exp.description, exp.displayOrder);
    });

    // Seed Showcase Projects
    const seedProjects = [
      {
        title: 'Accounting & Inventory Management Suite',
        category: 'Enterprise Software',
        description: 'A complete desktop/web accounting platform designed for small-to-medium businesses. Features automated ledger updates, multi-warehouse inventory tracking, VAT/tax calculation, and one-click PDF invoices.',
        tags: 'Accounting Software, SQL, Data Reporting, Automation',
        imageUrl: '',
        demoUrl: '#',
        githubUrl: '#',
        featured: 1,
        displayOrder: 0
      },
      {
        title: 'IT Helpdesk & Ticketing Knowledgebase',
        category: 'IT Support & Systems',
        description: 'Internal IT ticketing system allowing support staff to categorize incidents, track resolution times, generate step-by-step diagnostic workflows, and coordinate with software developers.',
        tags: 'IT Support, Troubleshooting, Knowledge Management, Web Systems',
        imageUrl: '',
        demoUrl: '#',
        githubUrl: '#',
        featured: 1,
        displayOrder: 1
      },
      {
        title: 'Automated Financial Statement & Audit Reconciliation',
        category: 'FinTech & Analytics',
        description: 'Automated data processing tool built to parse bank statements, cross-reference purchase orders against invoices, flag reconciliation discrepancies, and output auditor-ready Excel reports.',
        tags: 'MS Excel Advanced, Financial Analytics, Audit Support, Data Processing',
        imageUrl: '',
        demoUrl: '#',
        githubUrl: '#',
        featured: 1,
        displayOrder: 2
      }
    ];

    const insertProj = db.prepare(`
      INSERT INTO projects (title, category, description, tags, imageUrl, demoUrl, githubUrl, featured, displayOrder)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    seedProjects.forEach(p => {
      insertProj.run(p.title, p.category, p.description, p.tags, p.imageUrl, p.demoUrl, p.githubUrl, p.featured, p.displayOrder);
    });

    // Seed a welcome message
    const insertMsg = db.prepare(`
      INSERT INTO messages (name, email, subject, message, isRead)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertMsg.run(
      'System Admin',
      'system@portfolio.local',
      'Welcome to your new Portfolio CMS!',
      'Congratulations on your new portfolio website! You can edit any detail, add new projects, update your work experience, or upload new photos directly from this Admin Dashboard. Any inquiries sent from the public website will appear here in real-time.',
      0
    );
  }
}

function syncStaticJson() {
  try {
    const dataDir = path.join(__dirname, 'public', 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const s = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    if (!s) return;
    const { adminPasswordHash, adminPasswordSalt, ...publicSettings } = s;
    const payload = {
      settings: publicSettings,
      skills: db.prepare('SELECT * FROM skills ORDER BY displayOrder ASC, id ASC').all(),
      experiences: db.prepare('SELECT * FROM experiences ORDER BY displayOrder ASC, id DESC').all(),
      projects: db.prepare('SELECT * FROM projects ORDER BY displayOrder ASC, id DESC').all()
    };
    fs.writeFileSync(path.join(dataDir, 'portfolio.json'), JSON.stringify(payload, null, 2));
  } catch (err) {
    // Silently continue if filesystem write fails
  }
}

// Initialize on require
initDb();
syncStaticJson();

module.exports = {
  db,
  syncStaticJson,
  getSettings: () => {
    const s = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    if (!s) return null;
    const { adminPasswordHash, adminPasswordSalt, ...publicSettings } = s;
    return publicSettings;
  },
  getAuthSettings: () => {
    return db.prepare('SELECT id, adminUsername, adminPasswordSalt, adminPasswordHash FROM settings WHERE id = 1').get();
  },
  updateSettings: (data) => {
    const allowed = [
      'fullName', 'title', 'headline', 'bio', 'avatarUrl', 'resumeUrl',
      'email', 'phone', 'location', 'availability', 'linkedinUrl',
      'githubUrl', 'websiteUrl', 'accentColor', 'siteTitle', 'metaDescription'
    ];
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
    syncStaticJson();
    return db.prepare('SELECT * FROM settings WHERE id = 1').get();
  },
  updatePassword: (newSalt, newHash) => {
    db.prepare('UPDATE settings SET adminPasswordSalt = ?, adminPasswordHash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1').run(newSalt, newHash);
  },
  // Projects
  getProjects: () => db.prepare('SELECT * FROM projects ORDER BY displayOrder ASC, id DESC').all(),
  getProjectById: (id) => db.prepare('SELECT * FROM projects WHERE id = ?').get(id),
  createProject: (data) => {
    const stmt = db.prepare(`
      INSERT INTO projects (title, category, description, tags, imageUrl, demoUrl, githubUrl, featured, displayOrder)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      data.title || 'Untitled Project',
      data.category || 'General',
      data.description || '',
      data.tags || '',
      data.imageUrl || '',
      data.demoUrl || '',
      data.githubUrl || '',
      data.featured ? 1 : 0,
      data.displayOrder || 0
    );
    syncStaticJson();
    return db.prepare('SELECT * FROM projects WHERE id = ?').get(info.lastInsertRowid);
  },
  updateProject: (id, data) => {
    const stmt = db.prepare(`
      UPDATE projects SET
        title = ?, category = ?, description = ?, tags = ?,
        imageUrl = ?, demoUrl = ?, githubUrl = ?, featured = ?, displayOrder = ?
      WHERE id = ?
    `);
    stmt.run(
      data.title,
      data.category,
      data.description,
      data.tags,
      data.imageUrl,
      data.demoUrl,
      data.githubUrl,
      data.featured ? 1 : 0,
      data.displayOrder || 0,
      id
    );
    syncStaticJson();
    return db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  },
  deleteProject: (id) => {
    db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    syncStaticJson();
  },
  // Skills
  getSkills: () => db.prepare('SELECT * FROM skills ORDER BY displayOrder ASC, id ASC').all(),
  createSkill: (data) => {
    const stmt = db.prepare('INSERT INTO skills (name, category, proficiency, icon, displayOrder) VALUES (?, ?, ?, ?, ?)');
    const info = stmt.run(data.name, data.category || 'General', data.proficiency || 80, data.icon || 'star', data.displayOrder || 0);
    syncStaticJson();
    return db.prepare('SELECT * FROM skills WHERE id = ?').get(info.lastInsertRowid);
  },
  updateSkill: (id, data) => {
    db.prepare('UPDATE skills SET name = ?, category = ?, proficiency = ?, icon = ?, displayOrder = ? WHERE id = ?')
      .run(data.name, data.category, data.proficiency, data.icon, data.displayOrder || 0, id);
    syncStaticJson();
    return db.prepare('SELECT * FROM skills WHERE id = ?').get(id);
  },
  deleteSkill: (id) => {
    db.prepare('DELETE FROM skills WHERE id = ?').run(id);
    syncStaticJson();
  },
  // Experiences
  getExperiences: () => db.prepare('SELECT * FROM experiences ORDER BY displayOrder ASC, id DESC').all(),
  createExperience: (data) => {
    const stmt = db.prepare(`
      INSERT INTO experiences (type, role, organization, location, startDate, endDate, description, displayOrder)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      data.type || 'work',
      data.role,
      data.organization,
      data.location || '',
      data.startDate,
      data.endDate,
      data.description || '',
      data.displayOrder || 0
    );
    syncStaticJson();
    return db.prepare('SELECT * FROM experiences WHERE id = ?').get(info.lastInsertRowid);
  },
  updateExperience: (id, data) => {
    db.prepare(`
      UPDATE experiences SET
        type = ?, role = ?, organization = ?, location = ?,
        startDate = ?, endDate = ?, description = ?, displayOrder = ?
      WHERE id = ?
    `).run(
      data.type,
      data.role,
      data.organization,
      data.location || '',
      data.startDate,
      data.endDate,
      data.description || '',
      data.displayOrder || 0,
      id
    );
    syncStaticJson();
    return db.prepare('SELECT * FROM experiences WHERE id = ?').get(id);
  },
  deleteExperience: (id) => {
    db.prepare('DELETE FROM experiences WHERE id = ?').run(id);
    syncStaticJson();
  },
  // Messages
  getMessages: () => db.prepare('SELECT * FROM messages ORDER BY id DESC').all(),
  getMessageById: (id) => db.prepare('SELECT * FROM messages WHERE id = ?').get(id),
  createMessage: (data) => {
    const stmt = db.prepare('INSERT INTO messages (name, email, subject, message) VALUES (?, ?, ?, ?)');
    const info = stmt.run(data.name, data.email, data.subject || '', data.message);
    return db.prepare('SELECT * FROM messages WHERE id = ?').get(info.lastInsertRowid);
  },
  markMessageRead: (id, isRead = 1) => {
    db.prepare('UPDATE messages SET isRead = ? WHERE id = ?').run(isRead ? 1 : 0, id);
  },
  deleteMessage: (id) => {
    db.prepare('DELETE FROM messages WHERE id = ?').run(id);
  },
  // Analytics
  logPageView: (page, userAgent, ip) => {
    try {
      db.prepare('INSERT INTO analytics (page, userAgent, ip) VALUES (?, ?, ?)').run(page, userAgent || '', ip || '');
    } catch (e) {
      // Ignore
    }
  },
  getAnalyticsStats: () => {
    const totalViews = db.prepare('SELECT COUNT(*) as count FROM analytics').get().count;
    const todayViews = db.prepare("SELECT COUNT(*) as count FROM analytics WHERE date(timestamp) = date('now')").get().count;
    const totalMessages = db.prepare('SELECT COUNT(*) as count FROM messages').get().count;
    const unreadMessages = db.prepare('SELECT COUNT(*) as count FROM messages WHERE isRead = 0').get().count;
    const totalProjects = db.prepare('SELECT COUNT(*) as count FROM projects').get().count;
    const totalSkills = db.prepare('SELECT COUNT(*) as count FROM skills').get().count;

    return {
      totalViews,
      todayViews,
      totalMessages,
      unreadMessages,
      totalProjects,
      totalSkills
    };
  }
};
