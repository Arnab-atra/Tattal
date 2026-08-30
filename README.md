# Tattal

**Tattal** is a local business sales and inventory management desktop application.

It helps small businesses manage sales, products, inventory, customers, payments, expenses, and business reports from one desktop application.

## ✨ Features

- 📊 Sales management
- 📦 Product and inventory management
- 👥 Customer management
- 💰 Payment tracking
- 💸 Expense tracking
- 📈 Sales and business reports
- 📅 Daily, monthly, and yearly summaries
- 📊 Growth and performance reporting
- 💾 Local SQLite database
- 🖥️ Desktop application
- 🔒 Local-first data storage
- 🚀 Automated cross-platform releases

## 🖥️ Supported Platforms

### Linux

- `.deb` — Debian / Ubuntu
- `.rpm` — Fedora / RHEL / openSUSE
- `.AppImage` — Portable Linux application

### Windows

- `.exe` — NSIS installer
- `.msi` — Windows Installer

## 📥 Download

Download the latest version from:

**[Tattal Releases](https://github.com/Arnab-atra/Tattal/releases/latest)**

### Tattal v0.1.0

Available installers:

- `Tattal_0.1.0_amd64.deb`
- `Tattal-0.1.0-1.x86_64.rpm`
- `Tattal_0.1.0_amd64.AppImage`
- `Tattal_0.1.0_x64-setup.exe`
- `Tattal_0.1.0_x64_en-US.msi`

Choose the installer appropriate for your operating system.

## 🏗️ Architecture

```text
┌─────────────────────────────────────┐
│              Tattal                 │
│         Desktop Application         │
├─────────────────────────────────────┤
│                                     │
│  React + TypeScript + Vite          │
│              │                      │
│              ▼                      │
│           Tauri 2                   │
│              │                      │
│              ▼                      │
│             Rust                    │
│              │                      │
│              ▼                      │
│            SQLite                   │
│                                     │
└─────────────────────────────────────┘
```
