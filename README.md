 <div align="center">

# 🚀 FileJet

**Your files. Your storage. Your control.**

A modern file management application built for simplicity, organization, and a smooth user experience.

[Features](#-features) · [Technology](#-technology) · [Installation](#-installation) · [Roadmap](#-roadmap)

![Development](https://img.shields.io/badge/Status-In%20Development-F59E0B?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)

</div>

---

## 📖 Overview

FileJet is a full-stack file management application that provides a centralized workspace for organizing files, managing folders, and monitoring storage usage.

The project is built with a focus on maintainable code, straightforward navigation, and a responsive interface.

FileJet is actively being developed, with additional file sharing and collaboration features planned for future releases.

## ✨ Features

### File Management

- Upload and manage files through a web interface.
- Monitor upload progress in real time.
- Organize content using folders.
- Delete files and manage folder contents.
- Track file operations with loading states.

### Accounts & Storage

- User authentication and session handling.
- Account-based file management.
- Storage usage and limit tracking.
- PostgreSQL-backed user and file metadata.

### User Experience

- Dashboard-based navigation.
- Clean and minimal interface.
- File and folder management views.
- Interactive upload progress indicators.
- Reusable UI components.

## 🧰 Technology

FileJet combines a Vue-powered interface with a server-side application layer and a relational database.

**Frontend**

![Nuxt](https://img.shields.io/badge/Nuxt-18181B?style=for-the-badge&logo=nuxt&logoColor=00DC82)
![Vue.js](https://img.shields.io/badge/Vue.js-18181B?style=for-the-badge&logo=vuedotjs&logoColor=4FC08D)
![TypeScript](https://img.shields.io/badge/TypeScript-18181B?style=for-the-badge&logo=typescript&logoColor=3178C6)
![CSS](https://img.shields.io/badge/CSS-18181B?style=for-the-badge&logo=css&logoColor=663399)

**Backend & Database**

![Node.js](https://img.shields.io/badge/Node.js-18181B?style=for-the-badge&logo=nodedotjs&logoColor=5FA04E)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18181B?style=for-the-badge&logo=postgresql&logoColor=4169E1)
![Prisma](https://img.shields.io/badge/Prisma-18181B?style=for-the-badge&logo=prisma&logoColor=white)

## 🏗️ Architecture

FileJet uses Nuxt to handle both the user interface and server-side API endpoints.

```text
           FileJet Web Interface
                    |
              Nuxt / Vue
                    |
              Nitro API
                    |
          Application Services
                    |
             Prisma ORM
                    |
              PostgreSQL
```

The application is organized around reusable components, composables for shared frontend logic, and server-side endpoints responsible for processing requests.

## 🚀 Installation

### Requirements

Before running FileJet, make sure you have the following installed:

- Node.js and npm
- PostgreSQL
- Git

### Setup

**1. Clone the project**

```bash
git clone https://github.com/vaxen404/FileJetV2.git
cd FileJetV2
```

**2. Install dependencies**

```bash
npm install
```

**3. Configure environment variables**

Create a `.env` file in the root directory:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/filejet"
AUTH_SECRET="replace-with-a-secure-random-secret"
```

Replace the example values with your own configuration. Keep this file private and never commit credentials to Git.

**4. Generate the database client**

```bash
npx prisma generate
```

Ensure that your PostgreSQL database and required tables are configured before starting the application.

**5. Run the development server**

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

## 📁 Project Organization

The application separates user-facing features from backend operations to make development and maintenance easier.

| Directory | Purpose |
|---|---|
| `components/` | Reusable interface components |
| `composables/` | Shared reactive logic and API interactions |
| `pages/` | Application routes and views |
| `server/api/` | Server-side API endpoints |
| `server/utils/` | Backend utility functions |
| `prisma/` | Database schema and Prisma configuration |
| `assets/` | Application styles and assets |
| `public/` | Publicly accessible static resources |

## 🗺️ Roadmap

FileJet is evolving into a more complete personal storage and file-sharing platform.

**Core functionality**

- [x] User authentication foundation
- [x] File uploading
- [x] Upload progress tracking
- [x] Folder management
- [x] File deletion operations

**Planned improvements**

- [ ] Shareable file links
- [ ] Password-protected sharing
- [ ] File previews
- [ ] Advanced file searching
- [ ] File and folder organization improvements
- [ ] Additional account and storage controls
- [ ] Performance and reliability improvements

## 🔐 Security

FileJet's backend is designed to keep file operations separate from client-side application logic.

Authentication, request validation, and file access controls are important parts of the project's ongoing development.

Before deploying FileJet publicly, review its authentication, authorization, upload validation, storage permissions, and production configuration.

## 📌 Development Status

FileJet is an independent project currently under active development.

The application is being improved incrementally, and some planned features may not yet be available. APIs, configuration, and implementation details may change during development.

## 👨‍💻 Maintainer

Created and maintained by **[Vaxen](https://github.com/vaxen404)**.

For bug reports, suggestions, or feedback, use the repository's GitHub Issues section.

---

<div align="center">

**FileJet — A simpler way to manage your files.**

Built with Nuxt, TypeScript, Prisma, and PostgreSQL.

</div>