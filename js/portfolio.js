// ===================================================================
// PORTFOLIO CLIENT APPLICATION
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  fetchPortfolioData();
  initContactForm();
  initMobileMenu();
});

let portfolioState = {
  settings: null,
  skills: [],
  experiences: [],
  projects: []
};

// -------------------------------------------------------------------
// 1. THEME TOGGLE (Dark / Light)
// -------------------------------------------------------------------
function initTheme() {
  const themeToggle = document.getElementById('theme-toggle');
  const savedTheme = localStorage.getItem('portfolio-theme') || 'dark';

  if (savedTheme === 'light') {
    document.body.classList.remove('dark-theme');
    document.body.classList.add('light-theme');
  } else {
    document.body.classList.add('dark-theme');
    document.body.classList.remove('light-theme');
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
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
// 2. FETCH PORTFOLIO DATA
// -------------------------------------------------------------------
async function fetchPortfolioData() {
  try {
    let data;
    try {
      const res = await fetch('/api/portfolio');
      if (res.ok) {
        data = await res.json();
      }
    } catch (apiErr) {
      // API not reachable or static host
    }

    if (!data) {
      // Fallback to static data export for Vercel / Static hosting
      const staticRes = await fetch('/data/portfolio.json');
      if (!staticRes.ok) throw new Error('Failed to load portfolio data');
      data = await staticRes.json();
    }

    // Merge client-side saved modifications (for Vercel / browser admin edits)
    try {
      const localSettings = localStorage.getItem('portfolio_settings');
      if (localSettings) {
        data.settings = { ...data.settings, ...JSON.parse(localSettings) };
      }
      const localProjects = localStorage.getItem('portfolio_projects');
      if (localProjects) {
        data.projects = JSON.parse(localProjects);
      }
      const localSkills = localStorage.getItem('portfolio_skills');
      if (localSkills) {
        data.skills = JSON.parse(localSkills);
      }
      const localExperiences = localStorage.getItem('portfolio_experiences');
      if (localExperiences) {
        data.experiences = JSON.parse(localExperiences);
      }
    } catch (e) {}

    portfolioState = data;

    renderSettings(data.settings);
    renderExperiences(data.experiences);
    renderSkills(data.skills);
    renderProjects(data.projects);

  } catch (err) {
    console.error('Error loading portfolio:', err);
    showToast('Failed to load portfolio data. Please check connection.', 'error');
  }
}

// -------------------------------------------------------------------
// 3. RENDER SETTINGS & HERO
// -------------------------------------------------------------------
function renderSettings(s) {
  if (!s) return;

  // Title & Meta
  if (s.siteTitle) document.title = s.siteTitle;
  const metaDesc = document.getElementById('meta-description');
  if (metaDesc && s.metaDescription) metaDesc.setAttribute('content', s.metaDescription);

  // Accent Color
  if (s.accentColor) {
    document.documentElement.style.setProperty('--primary', s.accentColor);
    document.documentElement.style.setProperty('--primary-glow', s.accentColor + '33');
  }

  // Name & Headings
  const nameEls = ['nav-name', 'hero-name', 'footer-name'];
  nameEls.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = s.fullName || 'Dipesh Bista';
  });

  const heroTitle = document.getElementById('hero-title-text');
  if (heroTitle && s.title) heroTitle.textContent = s.title;

  const heroHeadline = document.getElementById('hero-headline');
  if (heroHeadline && s.headline) heroHeadline.textContent = s.headline;

  const heroAvailability = document.getElementById('hero-availability');
  if (heroAvailability && s.availability && heroAvailability.textContent !== s.availability) {
    heroAvailability.textContent = s.availability;
  }

  const aboutAvail = document.getElementById('about-availability');
  if (aboutAvail && s.availability && aboutAvail.textContent !== s.availability) {
    aboutAvail.textContent = s.availability;
  }

  const aboutBio = document.getElementById('about-bio');
  if (aboutBio && s.bio) aboutBio.textContent = s.bio;

  // Avatar
  const avatarUrl = s.avatarUrl || '/uploads/avatar.jpg';
  const navAvatar = document.getElementById('nav-avatar');
  if (navAvatar && navAvatar.getAttribute('src') !== avatarUrl) navAvatar.src = avatarUrl;
  const heroAvatar = document.getElementById('hero-avatar');
  if (heroAvatar && heroAvatar.getAttribute('src') !== avatarUrl) heroAvatar.src = avatarUrl;

  // Resume Download Links
  const resumeUrl = s.resumeUrl || '/uploads/resume.pdf';
  ['nav-resume-btn', 'hero-resume-btn'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.href = resumeUrl;
  });

  // Contact Info Elements
  const heroLocation = document.getElementById('hero-location');
  if (heroLocation && s.location) {
    heroLocation.querySelector('span').textContent = s.location;
  }
  const aboutLoc = document.getElementById('about-location');
  if (aboutLoc && s.location) aboutLoc.textContent = s.location;
  const contactLoc = document.getElementById('contact-location');
  if (contactLoc && s.location) contactLoc.textContent = s.location;

  // Email
  if (s.email) {
    const aboutEmail = document.getElementById('about-email');
    if (aboutEmail) aboutEmail.textContent = s.email;
    const contactEmail = document.getElementById('contact-email');
    if (contactEmail) contactEmail.textContent = s.email;
    const heroEmail = document.getElementById('hero-email-link');
    if (heroEmail) heroEmail.href = `mailto:${s.email}`;
    const cardEmail = document.getElementById('contact-email-card');
    if (cardEmail) cardEmail.href = `mailto:${s.email}`;
  }

  // Phone
  if (s.phone) {
    const aboutPhone = document.getElementById('about-phone');
    if (aboutPhone) aboutPhone.textContent = s.phone;
    const contactPhone = document.getElementById('contact-phone');
    if (contactPhone) contactPhone.textContent = s.phone;
    const heroPhone = document.getElementById('hero-phone-link');
    if (heroPhone) heroPhone.href = `tel:${s.phone.replace(/\s+/g, '')}`;
    const cardPhone = document.getElementById('contact-phone-card');
    if (cardPhone) cardPhone.href = `tel:${s.phone.replace(/\s+/g, '')}`;
  }

  // LinkedIn
  if (s.linkedinUrl) {
    const heroLi = document.getElementById('hero-linkedin');
    if (heroLi) heroLi.href = s.linkedinUrl;
    const contactLi = document.getElementById('contact-linkedin-text');
    if (contactLi) {
      const parts = s.linkedinUrl.split('/');
      contactLi.textContent = parts[parts.length - 1] || 'dipesh-bista';
    }
  }
}

// -------------------------------------------------------------------
// 4. RENDER EXPERIENCES & EDUCATION
// -------------------------------------------------------------------
function renderExperiences(experiences) {
  const container = document.getElementById('experience-timeline');
  if (!container) return;

  function renderList(filter) {
    container.innerHTML = '';
    const filtered = experiences.filter(exp => {
      if (filter === 'all') return true;
      return exp.type === filter;
    });

    if (filtered.length === 0) {
      container.innerHTML = `<p style="text-align:center; color:var(--text-muted); padding:2rem;">No entries found for this category.</p>`;
      return;
    }

    filtered.forEach(exp => {
      const item = document.createElement('div');
      item.className = 'timeline-item';

      const typeLabel = exp.type === 'education' ? '🎓 Education' : '💼 Work Experience';

      item.innerHTML = `
        <div class="timeline-marker"></div>
        <div class="timeline-content">
          <div class="timeline-header">
            <h3 class="timeline-role">${escapeHtml(exp.role)}</h3>
            <span class="timeline-badge">${typeLabel}</span>
          </div>
          <div class="timeline-meta">
            <span>${escapeHtml(exp.organization)}</span>
            ${exp.location ? `<span class="timeline-location">• ${escapeHtml(exp.location)}</span>` : ''}
            <span>• ${escapeHtml(exp.startDate)} — ${escapeHtml(exp.endDate)}</span>
          </div>
          <p class="timeline-desc">${escapeHtml(exp.description)}</p>
        </div>
      `;
      container.appendChild(item);
    });
  }

  // Tabs handler
  const tabs = document.querySelectorAll('.timeline-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderList(tab.getAttribute('data-filter'));
    });
  });

  renderList('all');
}

// -------------------------------------------------------------------
// 5. RENDER SKILLS
// -------------------------------------------------------------------
function renderSkills(skills) {
  const container = document.getElementById('skills-container');
  if (!container) return;

  container.innerHTML = '';

  // Group by category
  const categories = {};
  skills.forEach(skill => {
    const cat = skill.category || 'General';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(skill);
  });

  const catIcons = {
    'Technical Skills': '⚡',
    'Core Competencies': '🌟',
    'Tools & Software': '🛠️'
  };

  Object.entries(categories).forEach(([categoryName, items]) => {
    const card = document.createElement('div');
    card.className = 'skills-group-card';

    const icon = catIcons[categoryName] || '🔹';

    let skillRows = '';
    items.forEach(item => {
      const prof = Math.min(100, Math.max(0, item.proficiency || 80));
      skillRows += `
        <div class="skill-row">
          <div class="skill-info">
            <span>${escapeHtml(item.name)}</span>
            <span style="color:var(--text-dim); font-size:0.8rem;">${prof}%</span>
          </div>
          <div class="skill-bar-wrap">
            <div class="skill-bar-fill" style="width: ${prof}%;"></div>
          </div>
        </div>
      `;
    });

    card.innerHTML = `
      <h3 class="skills-group-title"><span>${icon}</span> ${escapeHtml(categoryName)}</h3>
      <div class="skill-list">
        ${skillRows}
      </div>
    `;

    container.appendChild(card);
  });
}

// -------------------------------------------------------------------
// 6. RENDER PROJECTS
// -------------------------------------------------------------------
function renderProjects(projects) {
  const grid = document.getElementById('projects-grid');
  const filterContainer = document.getElementById('project-filters');
  if (!grid) return;

  // Extract unique categories
  const categories = new Set();
  projects.forEach(p => {
    if (p.category) categories.add(p.category.trim());
  });

  // Render Filter Buttons
  if (filterContainer) {
    filterContainer.innerHTML = `<button class="filter-btn active" data-category="all">All (${projects.length})</button>`;
    categories.forEach(cat => {
      const count = projects.filter(p => p.category === cat).length;
      const btn = document.createElement('button');
      btn.className = 'filter-btn';
      btn.setAttribute('data-category', cat);
      btn.textContent = `${cat} (${count})`;
      filterContainer.appendChild(btn);
    });

    filterContainer.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        filterContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderList(btn.getAttribute('data-category'));
      });
    });
  }

  function renderList(filter) {
    grid.innerHTML = '';
    const filtered = projects.filter(p => {
      if (filter === 'all') return true;
      return p.category === filter;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 3rem;">No projects found in this category.</p>`;
      return;
    }

    filtered.forEach(p => {
      const card = document.createElement('div');
      card.className = 'project-card';

      // Parse tags
      const tagList = (p.tags || '').split(',').map(t => t.trim()).filter(Boolean);
      const tagHtml = tagList.map(t => `<span class="tag-pill">${escapeHtml(t)}</span>`).join('');

      const coverHtml = p.imageUrl
        ? `<img src="${p.imageUrl}" alt="${escapeHtml(p.title)}" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'project-cover-placeholder\\'>💻</div>';">`
        : `<div class="project-cover-placeholder">💻</div>`;

      card.innerHTML = `
        <div class="project-cover">
          ${coverHtml}
        </div>
        <div class="project-body">
          <span class="project-category">${escapeHtml(p.category || 'General')}</span>
          <h3 class="project-title">${escapeHtml(p.title)}</h3>
          <p class="project-desc">${escapeHtml(p.description)}</p>
          <div class="project-tags">${tagHtml}</div>
          <div class="project-links">
            ${p.demoUrl && p.demoUrl !== '#' ? `
              <a href="${p.demoUrl}" target="_blank" class="btn btn-primary btn-sm">
                <span>Live View</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
              </a>
            ` : ''}
            ${p.githubUrl && p.githubUrl !== '#' ? `
              <a href="${p.githubUrl}" target="_blank" class="btn btn-secondary btn-sm">
                <span>Code</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
              </a>
            ` : ''}
          </div>
        </div>
      `;

      grid.appendChild(card);
    });
  }

  renderList('all');
}

// -------------------------------------------------------------------
// 7. CONTACT FORM SUBMISSION
// -------------------------------------------------------------------
function initContactForm() {
  const form = document.getElementById('contact-form');
  const alertEl = document.getElementById('form-alert');
  const submitBtn = document.getElementById('submit-btn');
  const btnText = document.getElementById('btn-text');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const subject = form.subject.value.trim();
    const message = form.message.value.trim();

    if (!name || !email || !message) {
      showAlert('Please fill in all required fields.', 'error');
      return;
    }

    // Disable button during submission
    submitBtn.disabled = true;
    btnText.textContent = 'Sending message...';

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send message.');
      }

      showAlert('Thank you! Your message has been received successfully. I will get in touch soon!', 'success');
      form.reset();
      showToast('Message sent successfully!', 'success');

    } catch (err) {
      showAlert(err.message, 'error');
      showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      btnText.textContent = 'Send Message';
    }
  });

  function showAlert(msg, type) {
    if (!alertEl) return;
    alertEl.textContent = msg;
    alertEl.className = `form-alert ${type}`;
    alertEl.classList.remove('hidden');

    if (type === 'success') {
      setTimeout(() => {
        alertEl.classList.add('hidden');
      }, 7000);
    }
  }
}

// -------------------------------------------------------------------
// 8. MOBILE MENU
// -------------------------------------------------------------------
function initMobileMenu() {
  const btn = document.getElementById('mobile-menu-btn');
  const navLinks = document.getElementById('nav-links');

  if (btn && navLinks) {
    btn.addEventListener('click', () => {
      const isOpen = navLinks.style.display === 'flex';
      navLinks.style.display = isOpen ? 'none' : 'flex';
      if (!isOpen) {
        navLinks.style.flexDirection = 'column';
        navLinks.style.position = 'absolute';
        navLinks.style.top = '72px';
        navLinks.style.left = '0';
        navLinks.style.right = '0';
        navLinks.style.background = 'var(--bg-main)';
        navLinks.style.padding = '1.5rem';
        navLinks.style.borderBottom = '1px solid var(--border)';
      }
    });

    // Close on link click
    navLinks.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          navLinks.style.display = 'none';
        }
      });
    });
  }
}

// -------------------------------------------------------------------
// 9. TOAST HELPER
// -------------------------------------------------------------------
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : '⚠'}</span>
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
