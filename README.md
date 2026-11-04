# Dipesh Bista — Portfolio & Admin CMS Website

A fast, modern, full-stack Personal Portfolio and Content Management System (CMS). Built with zero external dependencies using Node.js and SQLite (`node:sqlite`).

---

## 🚀 Quick Start (1-Click)

### Option 1: Double-Click Launcher
Double-click **`start.bat`** in this folder. It will start the server and open your browser automatically.

### Option 2: Command Line
Open PowerShell or Command Prompt in `D:\Project` and run:
```powershell
.\node.cmd server.js
```

---

## 🌐 Website URLs

| Page | URL | Description |
| :--- | :--- | :--- |
| **Public Portfolio** | [http://localhost:3000/](http://localhost:3000/) | Your public portfolio for recruiters, clients, and visitors |
| **Admin Dashboard** | [http://localhost:3000/admin](http://localhost:3000/admin) | Full management portal to upload details and files |
| **Admin Login** | [http://localhost:3000/login](http://localhost:3000/login) | Secure login portal |

### 🔑 Default Admin Credentials
- **Username:** `admin`
- **Password:** `admin123`
*(You can change the password at any time from the Admin Dashboard under **Settings**)*

---

## ✨ Features

### 1. Public Portfolio
- **Hero Section**: Dynamic availability badge, title, headline, direct Resume download button, and social links.
- **About Me**: Extended background, key competencies, and quick contact cards.
- **Experience & Education Timeline**: Interactive filterable timeline categorized into work experience and academic history (pre-seeded with your MSc IT at UWS and BCA at Times International College).
- **Core Skills Matrix**: Visual proficiency meters grouped into Technical Skills and Core Competencies.
- **Featured Projects**: Filterable project gallery with tags, cover photos, and links to live demos and source code.
- **Interactive Contact Form**: Allows visitors to send inquiries directly to your database.
- **Dark / Light Theme**: Instant switcher with user preference remembered across sessions.

### 2. Admin Content Management System (CMS)
- **Live Analytics Dashboard**: View total page visits, inquiry counts, active projects, and recent contact messages.
- **Profile & Bio Editor**: Edit your full name, professional title, headline, detailed bio, location, phone number, and social links in real time.
- **Avatar & Resume File Upload**:
  - Drag-and-drop or select new profile photos (JPG, PNG, WebP) with instant preview.
  - Upload updated PDF resumes with 1-click test download.
- **Projects Manager**: Add, edit, reorder, or delete showcase projects with image uploads, tags, and URLs.
- **Timeline Manager**: Add and edit jobs, internships, degrees, and responsibilities.
- **Skills Manager**: Add and tune skills with real-time percentage sliders.
- **Inquiries Inbox**: View incoming messages with sender email, subject, timestamp, mark as read, and 1-click email reply.
- **Site Styling & Security**: Pick custom accent colors, change page SEO titles, and update the admin password.

---

## 📂 Project Structure

```
d:\Project/
├── server.js          # HTTP server, REST APIs, static & upload file serving
├── db.js              # SQLite database (tables, migrations & seed data)
├── auth.js            # Cryptographic PBKDF2 hashing & session token authentication
├── multipart.js       # Zero-dependency multipart/form-data upload parser
├── node.cmd           # Node.js binary wrapper
├── start.bat          # 1-click Windows launcher
├── package.json       # Metadata & npm script configurations
├── portfolio.db       # Persistent SQLite database
├── uploads/           # Uploaded avatars, resumes, and project images
│   ├── avatar.jpg     # Pre-seeded professional profile photo
│   └── resume.pdf     # Pre-seeded CV document
└── public/            # Frontend static assets
    ├── index.html     # Public Portfolio webpage
    ├── admin.html     # Admin CMS Dashboard
    ├── login.html     # Admin Login screen
    ├── css/           # Design stylesheets (style.css, admin.css)
    └── js/            # Client scripts (portfolio.js, admin.js)
```
