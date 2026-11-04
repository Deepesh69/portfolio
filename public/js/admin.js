// ===================================================================
// ADMIN CMS CLIENT APPLICATION
// ===================================================================

let adminState = {
  settings: null,
  stats: null,
  projects: [],
  experiences: [],
  skills: [],
  messages: []
};

document.addEventListener('DOMContentLoaded', async () => {
  const isAuthed = await checkAuth();
  if (!isAuthed) return;

  initNavigation();
  initThemeToggle();
  initProfileForm();
  initUploads();
  initProjectHandlers();
  initExperienceHandlers();
  initSkillHandlers();
  initSiteSettings();
  initPasswordForm();
  initLogout();

  // Initial Data Load
  await refreshAllData();
});

// -------------------------------------------------------------------
// 1. AUTH CHECK & LOGOUT
// -------------------------------------------------------------------
async function checkAuth() {
  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      const data = await res.json();
      adminState.settings = data.settings;
      return true;
    }
  } catch (err) {
    // API not reachable (e.g. static hosting on Vercel)
  }

  // Fallback for Vercel / static hosting
  const token = localStorage.getItem('admin_token');
  if (token) {
    try {
      const pRes = await fetch('/data/portfolio.json');
      if (pRes.ok) {
        const pData = await pRes.json();
        adminState.settings = pData.settings;
      }
    } catch (e) {}
    return true;
  }

  window.location.href = '/login';
  return false;
}

function initLogout() {
  const btn = document.getElementById('logout-btn');
  if (btn) {
    btn.addEventListener('click', async () => {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch (e) {}
      localStorage.removeItem('admin_token');
      window.location.href = '/login';
    });
  }
}

// -------------------------------------------------------------------
// 2. NAVIGATION & TABS
// -------------------------------------------------------------------
function initNavigation() {
  const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabId = item.getAttribute('data-tab');
      switchTab(tabId);
    });
  });
}

function switchTab(tabId) {
  // Update sidebar active class
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
    if (item.getAttribute('data-tab') === tabId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Update tab pane active class
  document.querySelectorAll('.tab-pane').forEach(pane => {
    if (pane.id === tabId) {
      pane.classList.add('active');
    } else {
      pane.classList.remove('active');
    }
  });

  // Update Topbar Heading
  const titles = {
    'tab-dashboard': 'Dashboard',
    'tab-profile': 'Profile & Bio Information',
    'tab-uploads': 'Avatar & Resume Upload',
    'tab-projects': 'Showcase Projects',
    'tab-experience': 'Experience & Education',
    'tab-skills': 'Skills & Proficiencies',
    'tab-messages': 'Contact Inquiries',
    'tab-settings': 'Settings & Security'
  };
  const heading = document.getElementById('tab-heading');
  if (heading && titles[tabId]) {
    heading.textContent = titles[tabId];
  }
}

function initThemeToggle() {
  const toggle = document.getElementById('admin-theme-toggle');
  const saved = localStorage.getItem('portfolio-theme') || 'dark';

  if (saved === 'light') {
    document.body.classList.remove('dark-theme');
    document.body.classList.add('light-theme');
  }

  if (toggle) {
    toggle.addEventListener('click', () => {
      const isDark = document.body.classList.contains('dark-theme');
      if (isDark) {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
        localStorage.setItem('portfolio-theme', 'light');
      } else {
        document.body.classList.add('dark-theme');
        document.body.classList.remove('light-theme');
        localStorage.setItem('portfolio-theme', 'dark');
      }
    });
  }
}

// -------------------------------------------------------------------
// 3. DATA REFRESHING
// -------------------------------------------------------------------
async function refreshAllData() {
  await Promise.all([
    loadDashboard(),
    loadProjects(),
    loadExperiences(),
    loadSkills(),
    loadMessages()
  ]);
}

async function loadDashboard() {
  try {
    let data = null;
    try {
      const res = await fetch('/api/admin/dashboard');
      if (res.ok) data = await res.json();
    } catch (e) {}

    if (!data) {
      const pRes = await fetch('/data/portfolio.json');
      if (pRes.ok) {
        const pData = await pRes.json();
        data = {
          stats: {
            totalViews: 1,
            totalMessages: 0,
            unreadMessages: 0,
            totalProjects: (pData.projects || []).length,
            totalSkills: (pData.skills || []).length
          },
          recentMessages: [],
          settings: pData.settings
        };
      }
    }
    if (!data) return;
    adminState.stats = data.stats;
    adminState.settings = data.settings;

    // Update Stats Cards
    document.getElementById('stat-views').textContent = data.stats.totalViews || 0;
    document.getElementById('stat-messages').textContent = data.stats.totalMessages || 0;
    document.getElementById('stat-projects').textContent = data.stats.totalProjects || 0;
    document.getElementById('stat-skills').textContent = data.stats.totalSkills || 0;

    const unread = data.stats.unreadMessages || 0;
    const unreadBadge = document.getElementById('stat-unread-badge');
    if (unreadBadge) {
      unreadBadge.textContent = `${unread} unread`;
      unreadBadge.style.color = unread > 0 ? 'var(--danger)' : 'var(--text-dim)';
    }

    // Populate Sidebar info
    if (data.settings) {
      const sbName = document.getElementById('sidebar-name');
      if (sbName) sbName.textContent = data.settings.fullName;
      const sbAvatar = document.getElementById('sidebar-avatar');
      if (sbAvatar && data.settings.avatarUrl) sbAvatar.src = data.settings.avatarUrl;

      fillProfileForm(data.settings);
      fillSiteSettings(data.settings);
    }

    // Populate Recent Messages in Dashboard
    const recentBox = document.getElementById('dashboard-recent-messages');
    if (recentBox && data.recentMessages) {
      if (data.recentMessages.length === 0) {
        recentBox.innerHTML = `<p style="color:var(--text-dim); padding:1rem 0;">No inquiries received yet.</p>`;
      } else {
        let rows = '';
        data.recentMessages.forEach(m => {
          rows += `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:0.75rem 0; border-bottom:1px solid var(--border);">
              <div>
                <strong>${escapeHtml(m.name)}</strong>
                <span style="color:var(--text-dim); font-size:0.85rem; margin-left:0.5rem;">(${escapeHtml(m.email)})</span>
                <p style="color:var(--text-muted); font-size:0.88rem; margin-top:0.2rem;">${escapeHtml(m.subject || m.message.substring(0, 60))}</p>
              </div>
              <div>
                <button class="action-btn" onclick="viewMessage(${m.id})">Read</button>
              </div>
            </div>
          `;
        });
        recentBox.innerHTML = rows;
      }
    }

  } catch (err) {
    console.error('Failed to load dashboard:', err);
  }
}

// -------------------------------------------------------------------
// 4. PROFILE TAB
// -------------------------------------------------------------------
function fillProfileForm(s) {
  if (!s) return;
  const fields = ['fullName', 'title', 'headline', 'bio', 'email', 'phone', 'location', 'availability', 'linkedinUrl', 'githubUrl'];
  fields.forEach(f => {
    const el = document.getElementById(`prof-${f}`);
    if (el && s[f] !== undefined) {
      el.value = s[f] || '';
    }
  });
}

function initProfileForm() {
  const form = document.getElementById('profile-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      fullName: form.fullName.value.trim(),
      title: form.title.value.trim(),
      headline: form.headline.value.trim(),
      bio: form.bio.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      location: form.location.value.trim(),
      availability: form.availability.value.trim(),
      linkedinUrl: form.linkedinUrl.value.trim(),
      githubUrl: form.githubUrl.value.trim()
    };

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');

      showToast('Profile information updated successfully!', 'success');
      loadDashboard();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

// -------------------------------------------------------------------
// 5. UPLOADS (AVATAR & RESUME)
// -------------------------------------------------------------------
function initUploads() {
  // Avatar Uploader
  const avatarInput = document.getElementById('avatar-file-input');
  const avatarDropZone = document.getElementById('avatar-drop-zone');

  if (avatarInput) {
    avatarInput.addEventListener('change', () => {
      if (avatarInput.files.length > 0) {
        uploadFile(avatarInput.files[0], 'avatar');
      }
    });
  }

  if (avatarDropZone) {
    avatarDropZone.addEventListener('click', () => avatarInput.click());
    setupDragDrop(avatarDropZone, (file) => uploadFile(file, 'avatar'));
  }

  // Resume Uploader
  const resumeInput = document.getElementById('resume-file-input');
  const resumeDropZone = document.getElementById('resume-drop-zone');

  if (resumeInput) {
    resumeInput.addEventListener('change', () => {
      if (resumeInput.files.length > 0) {
        uploadFile(resumeInput.files[0], 'resume');
      }
    });
  }

  if (resumeDropZone) {
    resumeDropZone.addEventListener('click', () => resumeInput.click());
    setupDragDrop(resumeDropZone, (file) => uploadFile(file, 'resume'));
  }
}

function setupDragDrop(zone, onFileDrop) {
  ['dragenter', 'dragover'].forEach(name => {
    zone.addEventListener(name, (e) => {
      e.preventDefault();
      e.stopPropagation();
      zone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(name => {
    zone.addEventListener(name, (e) => {
      e.preventDefault();
      e.stopPropagation();
      zone.classList.remove('dragover');
    });
  });

  zone.addEventListener('drop', (e) => {
    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      onFileDrop(e.dataTransfer.files[0]);
    }
  });
}

async function uploadFile(file, type) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);

  showToast(`Uploading ${type}...`, 'info');

  try {
    const res = await fetch('/api/admin/upload', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');

    if (type === 'avatar') {
      const preview = document.getElementById('avatar-preview-img');
      if (preview) preview.src = data.url;
      const sbAvatar = document.getElementById('sidebar-avatar');
      if (sbAvatar) sbAvatar.src = data.url;
      showToast('Avatar photo updated successfully!', 'success');
    } else if (type === 'resume') {
      const filenameLabel = document.getElementById('resume-current-filename');
      if (filenameLabel) filenameLabel.textContent = file.name;
      showToast('Resume PDF uploaded successfully!', 'success');
    }

  } catch (err) {
    showToast(err.message, 'error');
  }
}

// -------------------------------------------------------------------
// 6. PROJECTS CRUD
// -------------------------------------------------------------------
async function loadProjects() {
  try {
    let projects = null;
    try {
      const res = await fetch('/api/admin/projects');
      if (res.ok) projects = await res.json();
    } catch (e) {}

    if (!projects) {
      const pRes = await fetch('/data/portfolio.json');
      if (pRes.ok) {
        const pData = await pRes.json();
        projects = pData.projects || [];
      }
    }
    if (!projects) return;
    adminState.projects = projects;

    // Update count badge
    const badge = document.getElementById('badge-projects-count');
    if (badge) badge.textContent = projects.length;

    const tbody = document.getElementById('projects-table-body');
    if (!tbody) return;

    if (projects.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--text-dim);">No projects found. Click '+ Add New Project' to get started!</td></tr>`;
      return;
    }

    let rows = '';
    projects.forEach(p => {
      const thumb = p.imageUrl
        ? `<div class="table-avatar-thumb"><img src="${p.imageUrl}" alt="${escapeHtml(p.title)}"></div>`
        : `<div class="table-avatar-thumb">💻</div>`;

      rows += `
        <tr>
          <td>${thumb}</td>
          <td><strong>${escapeHtml(p.title)}</strong></td>
          <td><span class="timeline-badge">${escapeHtml(p.category)}</span></td>
          <td><span style="font-size:0.82rem; color:var(--text-dim);">${escapeHtml(p.tags || '-')}</span></td>
          <td>
            <div style="display:flex; gap:0.4rem;">
              ${p.demoUrl && p.demoUrl !== '#' ? `<a href="${p.demoUrl}" target="_blank" class="action-btn" title="Demo">🔗</a>` : ''}
              ${p.githubUrl && p.githubUrl !== '#' ? `<a href="${p.githubUrl}" target="_blank" class="action-btn" title="Code">🐙</a>` : ''}
            </div>
          </td>
          <td>
            <div class="action-btns">
              <button class="action-btn" onclick="openEditProjectModal(${p.id})">Edit</button>
              <button class="action-btn delete" onclick="deleteProject(${p.id})">Delete</button>
            </div>
          </td>
        </tr>
      `;
    });
    tbody.innerHTML = rows;

  } catch (err) {
    console.error('Failed to load projects:', err);
  }
}

function initProjectHandlers() {
  const form = document.getElementById('project-modal-form');
  const fileInput = document.getElementById('proj-file-input');

  if (fileInput) {
    fileInput.addEventListener('change', async () => {
      if (fileInput.files.length > 0) {
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        formData.append('type', 'project');

        try {
          const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
          const data = await res.json();
          if (data.success) {
            document.getElementById('proj-imageUrl').value = data.url;
            document.getElementById('proj-img-preview').innerHTML = `<img src="${data.url}" style="width:100%; height:100%; object-fit:cover;">`;
            showToast('Project image uploaded!', 'success');
          }
        } catch (e) {
          showToast('Image upload failed', 'error');
        }
      }
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('proj-id').value;
      const payload = {
        title: form.title.value.trim(),
        category: form.category.value.trim(),
        tags: form.tags.value.trim(),
        description: form.description.value.trim(),
        demoUrl: form.demoUrl.value.trim(),
        githubUrl: form.githubUrl.value.trim(),
        imageUrl: form.imageUrl.value.trim()
      };

      try {
        const url = id ? `/api/admin/projects/${id}` : '/api/admin/projects';
        const method = id ? 'PUT' : 'POST';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error('Failed to save project');

        closeModal('project-modal');
        showToast(id ? 'Project updated!' : 'Project added!', 'success');
        await loadProjects();
        await loadDashboard();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
}

function openAddProjectModal() {
  document.getElementById('project-modal-title').textContent = 'Add New Project';
  const form = document.getElementById('project-modal-form');
  form.reset();
  document.getElementById('proj-id').value = '';
  document.getElementById('proj-imageUrl').value = '';
  document.getElementById('proj-img-preview').innerHTML = '<span>💻</span>';
  openModal('project-modal');
}

function openEditProjectModal(id) {
  const p = adminState.projects.find(x => x.id === id);
  if (!p) return;

  document.getElementById('project-modal-title').textContent = 'Edit Project';
  document.getElementById('proj-id').value = p.id;
  document.getElementById('proj-title').value = p.title;
  document.getElementById('proj-category').value = p.category;
  document.getElementById('proj-tags').value = p.tags || '';
  document.getElementById('proj-description').value = p.description || '';
  document.getElementById('proj-demoUrl').value = p.demoUrl || '';
  document.getElementById('proj-githubUrl').value = p.githubUrl || '';
  document.getElementById('proj-imageUrl').value = p.imageUrl || '';

  if (p.imageUrl) {
    document.getElementById('proj-img-preview').innerHTML = `<img src="${p.imageUrl}" style="width:100%; height:100%; object-fit:cover;">`;
  } else {
    document.getElementById('proj-img-preview').innerHTML = '<span>💻</span>';
  }

  openModal('project-modal');
}

async function deleteProject(id) {
  if (!confirm('Are you sure you want to delete this project?')) return;
  try {
    const res = await fetch(`/api/admin/projects/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete');
    showToast('Project deleted', 'success');
    await loadProjects();
    await loadDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// -------------------------------------------------------------------
// 7. EXPERIENCE & EDUCATION CRUD
// -------------------------------------------------------------------
async function loadExperiences() {
  try {
    let list = null;
    try {
      const res = await fetch('/api/admin/experiences');
      if (res.ok) list = await res.json();
    } catch (e) {}

    if (!list) {
      const pRes = await fetch('/data/portfolio.json');
      if (pRes.ok) {
        const pData = await pRes.json();
        list = pData.experiences || [];
      }
    }
    if (!list) return;
    adminState.experiences = list;

    const tbody = document.getElementById('experience-table-body');
    if (!tbody) return;

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--text-dim);">No experience entries found.</td></tr>`;
      return;
    }

    let rows = '';
    list.forEach(item => {
      const typeLabel = item.type === 'education' ? '🎓 Education' : '💼 Work';
      rows += `
        <tr>
          <td><span class="timeline-badge">${typeLabel}</span></td>
          <td><strong>${escapeHtml(item.role)}</strong></td>
          <td>${escapeHtml(item.organization)}</td>
          <td>${escapeHtml(item.startDate)} - ${escapeHtml(item.endDate)}</td>
          <td>${escapeHtml(item.location || '-')}</td>
          <td>
            <div class="action-btns">
              <button class="action-btn" onclick="openEditExperienceModal(${item.id})">Edit</button>
              <button class="action-btn delete" onclick="deleteExperience(${item.id})">Delete</button>
            </div>
          </td>
        </tr>
      `;
    });
    tbody.innerHTML = rows;

  } catch (err) {
    console.error('Failed to load experiences:', err);
  }
}

function initExperienceHandlers() {
  const form = document.getElementById('experience-modal-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('exp-id').value;
    const payload = {
      type: form.type.value,
      role: form.role.value.trim(),
      organization: form.organization.value.trim(),
      location: form.location.value.trim(),
      startDate: form.startDate.value.trim(),
      endDate: form.endDate.value.trim(),
      description: form.description.value.trim()
    };

    try {
      const url = id ? `/api/admin/experiences/${id}` : '/api/admin/experiences';
      const method = id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to save experience entry');

      closeModal('experience-modal');
      showToast(id ? 'Timeline entry updated!' : 'Timeline entry added!', 'success');
      await loadExperiences();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

function openAddExperienceModal() {
  document.getElementById('experience-modal-title').textContent = 'Add Timeline Entry';
  const form = document.getElementById('experience-modal-form');
  form.reset();
  document.getElementById('exp-id').value = '';
  openModal('experience-modal');
}

function openEditExperienceModal(id) {
  const exp = adminState.experiences.find(x => x.id === id);
  if (!exp) return;

  document.getElementById('experience-modal-title').textContent = 'Edit Timeline Entry';
  document.getElementById('exp-id').value = exp.id;
  document.getElementById('exp-type').value = exp.type;
  document.getElementById('exp-role').value = exp.role;
  document.getElementById('exp-organization').value = exp.organization;
  document.getElementById('exp-location').value = exp.location || '';
  document.getElementById('exp-startDate').value = exp.startDate;
  document.getElementById('exp-endDate').value = exp.endDate;
  document.getElementById('exp-description').value = exp.description || '';

  openModal('experience-modal');
}

async function deleteExperience(id) {
  if (!confirm('Are you sure you want to remove this entry?')) return;
  try {
    const res = await fetch(`/api/admin/experiences/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete');
    showToast('Entry removed', 'success');
    await loadExperiences();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// -------------------------------------------------------------------
// 8. SKILLS CRUD
// -------------------------------------------------------------------
async function loadSkills() {
  try {
    let skills = null;
    try {
      const res = await fetch('/api/admin/skills');
      if (res.ok) skills = await res.json();
    } catch (e) {}

    if (!skills) {
      const pRes = await fetch('/data/portfolio.json');
      if (pRes.ok) {
        const pData = await pRes.json();
        skills = pData.skills || [];
      }
    }
    if (!skills) return;
    adminState.skills = skills;

    const badge = document.getElementById('badge-skills-count');
    if (badge) badge.textContent = skills.length;

    const tbody = document.getElementById('skills-table-body');
    if (!tbody) return;

    if (skills.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:2rem; color:var(--text-dim);">No skills added yet.</td></tr>`;
      return;
    }

    let rows = '';
    skills.forEach(s => {
      rows += `
        <tr>
          <td><strong>${escapeHtml(s.name)}</strong></td>
          <td><span class="timeline-badge">${escapeHtml(s.category)}</span></td>
          <td>
            <div style="display:flex; align-items:center; gap:0.5rem; width:140px;">
              <div class="skill-bar-wrap"><div class="skill-bar-fill" style="width:${s.proficiency}%"></div></div>
              <span style="font-size:0.75rem; color:var(--text-dim);">${s.proficiency}%</span>
            </div>
          </td>
          <td>${s.displayOrder || 0}</td>
          <td>
            <div class="action-btns">
              <button class="action-btn" onclick="openEditSkillModal(${s.id})">Edit</button>
              <button class="action-btn delete" onclick="deleteSkill(${s.id})">Delete</button>
            </div>
          </td>
        </tr>
      `;
    });
    tbody.innerHTML = rows;

  } catch (err) {
    console.error('Failed to load skills:', err);
  }
}

function initSkillHandlers() {
  const form = document.getElementById('skill-modal-form');
  const slider = document.getElementById('skill-proficiency');
  const profVal = document.getElementById('skill-prof-val');

  if (slider && profVal) {
    slider.addEventListener('input', () => {
      profVal.textContent = slider.value + '%';
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('skill-id').value;
      const payload = {
        name: form.name.value.trim(),
        category: form.category.value,
        proficiency: parseInt(form.proficiency.value, 10)
      };

      try {
        const url = id ? `/api/admin/skills/${id}` : '/api/admin/skills';
        const method = id ? 'PUT' : 'POST';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error('Failed to save skill');

        closeModal('skill-modal');
        showToast(id ? 'Skill updated!' : 'Skill added!', 'success');
        await loadSkills();
        await loadDashboard();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
}

function openAddSkillModal() {
  document.getElementById('skill-modal-title').textContent = 'Add Skill';
  const form = document.getElementById('skill-modal-form');
  form.reset();
  document.getElementById('skill-id').value = '';
  document.getElementById('skill-proficiency').value = 85;
  document.getElementById('skill-prof-val').textContent = '85%';
  openModal('skill-modal');
}

function openEditSkillModal(id) {
  const s = adminState.skills.find(x => x.id === id);
  if (!s) return;

  document.getElementById('skill-modal-title').textContent = 'Edit Skill';
  document.getElementById('skill-id').value = s.id;
  document.getElementById('skill-name').value = s.name;
  document.getElementById('skill-category').value = s.category;
  document.getElementById('skill-proficiency').value = s.proficiency;
  document.getElementById('skill-prof-val').textContent = s.proficiency + '%';

  openModal('skill-modal');
}

async function deleteSkill(id) {
  if (!confirm('Are you sure you want to remove this skill?')) return;
  try {
    const res = await fetch(`/api/admin/skills/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete');
    showToast('Skill removed', 'success');
    await loadSkills();
    await loadDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// -------------------------------------------------------------------
// 9. MESSAGES INBOX
// -------------------------------------------------------------------
async function loadMessages() {
  try {
    const res = await fetch('/api/admin/messages');
    if (!res.ok) return;
    const msgs = await res.json();
    adminState.messages = msgs;

    const unreadCount = msgs.filter(m => !m.isRead).length;
    const badge = document.getElementById('badge-messages-count');
    if (badge) {
      badge.textContent = unreadCount;
      badge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
    }

    const tbody = document.getElementById('messages-table-body');
    if (!tbody) return;

    if (msgs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--text-dim);">No inquiries in your inbox.</td></tr>`;
      return;
    }

    let rows = '';
    msgs.forEach(m => {
      const isReadClass = m.isRead ? 'status-read' : 'status-unread';
      const readLabel = m.isRead ? 'Read' : 'New';
      const dateStr = new Date(m.created_at).toLocaleDateString();

      rows += `
        <tr style="${!m.isRead ? 'font-weight:600; background:rgba(79,70,229,0.05);' : ''}">
          <td><span class="status-dot ${isReadClass}"></span><small>${readLabel}</small></td>
          <td><strong>${escapeHtml(m.name)}</strong></td>
          <td><a href="mailto:${escapeHtml(m.email)}" style="color:var(--primary);">${escapeHtml(m.email)}</a></td>
          <td>${escapeHtml(m.subject || m.message.substring(0, 40))}</td>
          <td><small style="color:var(--text-dim);">${dateStr}</small></td>
          <td>
            <div class="action-btns">
              <button class="action-btn" onclick="viewMessage(${m.id})">Open</button>
              <button class="action-btn delete" onclick="deleteMessage(${m.id})">Delete</button>
            </div>
          </td>
        </tr>
      `;
    });
    tbody.innerHTML = rows;

  } catch (err) {
    console.error('Failed to load messages:', err);
  }
}

async function viewMessage(id) {
  const m = adminState.messages.find(x => x.id === id);
  if (!m) return;

  document.getElementById('view-msg-sender').textContent = m.name;
  const emailEl = document.getElementById('view-msg-email');
  emailEl.textContent = m.email;
  emailEl.href = `mailto:${m.email}`;

  document.getElementById('view-msg-subject').textContent = m.subject || '(No Subject)';
  document.getElementById('view-msg-body').textContent = m.message;

  const replyBtn = document.getElementById('view-msg-reply');
  replyBtn.href = `mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subject || 'Portfolio Inquiry')}`;

  openModal('message-modal');

  // Mark as read
  if (!m.isRead) {
    try {
      await fetch(`/api/admin/messages/${id}/read`, { method: 'PUT' });
      m.isRead = 1;
      await loadMessages();
      await loadDashboard();
    } catch (e) {}
  }
}

async function deleteMessage(id) {
  if (!confirm('Are you sure you want to delete this message?')) return;
  try {
    const res = await fetch(`/api/admin/messages/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete');
    showToast('Message deleted', 'success');
    await loadMessages();
    await loadDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// -------------------------------------------------------------------
// 10. SITE SETTINGS & PASSWORD
// -------------------------------------------------------------------
function fillSiteSettings(s) {
  if (!s) return;
  const siteTitle = document.getElementById('set-siteTitle');
  if (siteTitle && s.siteTitle) siteTitle.value = s.siteTitle;

  const metaDesc = document.getElementById('set-metaDescription');
  if (metaDesc && s.metaDescription) metaDesc.value = s.metaDescription;

  const colorInput = document.getElementById('set-accentColor');
  const colorHex = document.getElementById('set-color-hex');
  if (colorInput && s.accentColor) {
    colorInput.value = s.accentColor;
    if (colorHex) colorHex.textContent = s.accentColor;
  }
}

function initSiteSettings() {
  const form = document.getElementById('site-settings-form');
  const colorInput = document.getElementById('set-accentColor');
  const colorHex = document.getElementById('set-color-hex');

  if (colorInput && colorHex) {
    colorInput.addEventListener('input', () => {
      colorHex.textContent = colorInput.value;
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        siteTitle: form.siteTitle.value.trim(),
        metaDescription: form.metaDescription.value.trim(),
        accentColor: form.accentColor.value
      };

      try {
        const res = await fetch('/api/admin/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Failed to save settings');
        showToast('Site settings updated!', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
}

function initPasswordForm() {
  const form = document.getElementById('password-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPassword = form.currentPassword.value;
    const newPassword = form.newPassword.value;
    const confirmPassword = form.confirmPassword.value;

    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match!', 'error');
      return;
    }

    try {
      const res = await fetch('/api/admin/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password');

      showToast('Password updated successfully!', 'success');
      form.reset();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

// -------------------------------------------------------------------
// 11. MODAL HELPERS & UTILITIES
// -------------------------------------------------------------------
function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('hidden');
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('hidden');
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : (type === 'error' ? '⚠' : 'ℹ')}</span>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
