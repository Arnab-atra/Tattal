# Tattal

**Tattal** is a local-first desktop application for small businesses to manage sales, inventory, customers, payments, expenses, and business reports.

It is designed to keep business data locally available while providing a simple desktop experience for everyday business operations.

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

## 🐧 Linux Installation

Choose the package that matches your Linux distribution.

### Debian / Ubuntu

Download the `.deb` package from the latest release.

Example:

```text
Tattal_0.1.0_amd64.deb

Install it with:

sudo apt install ./Tattal_0.1.0_amd64.deb
Fedora / RHEL / openSUSE

Download the .rpm package from the latest release.

Example:

Tattal-0.1.0-1.x86_64.rpm

Install it using your distribution's package manager.

For Fedora:

sudo dnf install ./Tattal-0.1.0-1.x86_64.rpm
AppImage

Download the AppImage from the latest release.

Example:

Tattal_0.1.0_amd64.AppImage

Make it executable:

chmod +x Tattal_0.1.0_amd64.AppImage

Run Tattal:

./Tattal_0.1.0_amd64.AppImage
🪟 Windows Installation

Windows users can choose either installer.

NSIS Installer

Download:

Tattal_0.1.0_x64-setup.exe

Run the installer and follow the Windows installation wizard.

MSI Installer

Download:

Tattal_0.1.0_x64_en-US.msi

Open the MSI file and follow the installation wizard.

💾 Data Storage

Tattal uses a local SQLite database for application data.

The application is designed around local-first data storage and does not require a cloud database for normal operation.

Your business data remains on the local machine where Tattal is installed.

🏗️ Architecture
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
Technology Stack
Component	Technology
Frontend	React + TypeScript
Build Tool	Vite
Desktop Framework	Tauri 2
Backend / Native Layer	Rust
Database	SQLite
Database Access	SQLx
CI/CD	GitHub Actions
📁 Project Structure
Tattal/
├── backend/
├── database/
│   └── migrations/
├── frontend/
├── src-tauri/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── release.yml
├── README.md
├── package.json
└── package-lock.json
🛠️ Building From Source
Requirements

Before building Tattal from source, install:

Git
Node.js 24+
npm
Rust
Tauri 2 system dependencies
Clone the Repository
git clone https://github.com/Arnab-atra/Tattal.git
cd Tattal
Install Frontend Dependencies
cd frontend
npm ci
cd ..
Check the Rust Projects
cargo check --manifest-path backend/Cargo.toml
cargo check --manifest-path src-tauri/Cargo.toml
Build Tattal

From the project root:

npm --prefix frontend exec tauri -- build \
  --config src-tauri/tauri.conf.json

The generated application and installers will be placed under:

src-tauri/target/release/
🧪 Development

Install frontend dependencies:

cd frontend
npm ci

Run the frontend development server:

npm run dev

For the Tauri desktop development application:

npm --prefix frontend exec tauri -- dev
🚀 Releases

Tattal uses GitHub Actions to build and publish desktop installers.

Creating a version tag triggers the release workflow:

git tag v0.1.0
git push origin v0.1.0

The release workflow builds packages for supported platforms.

Linux
.deb
.rpm
.AppImage
Windows
.exe
.msi

Release packages are published to the project's GitHub Releases page.

📊 Current Release

Version: v0.1.0

Tattal is currently in its early release stage.

The project is actively being developed with a focus on:

Sales management
Inventory management
Customer management
Payment tracking
Expense tracking
Business reporting
Local-first data storage
Cross-platform desktop distribution
🐛 Bug Reports and Feature Requests

If you find a bug, encounter a problem, or have an idea for improving Tattal, please open an issue in the GitHub repository.

When reporting a bug, include:

Operating system
Tattal version
Steps to reproduce the problem
Expected behavior
Actual behavior
Relevant error messages or screenshots
🤝 Contributing

Contributions, suggestions, and improvements are welcome.

Before submitting changes:

Create a branch for your changes.
Make your changes.
Run the relevant checks.
Commit your changes with a clear message.
Open a pull request.
📄 License

License information will be added to the project as the project matures.
```
