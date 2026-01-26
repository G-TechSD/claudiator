# Claudiator

> **WARNING: BETA SOFTWARE** - This software was developed with AI assistance and is provided AS-IS without warranty. It provides direct terminal access to your system. Read the [Security](#security) and [Disclaimer](#disclaimer) sections before use. The developers are not responsible for any damage, data loss, or security incidents.

**Multi-terminal management for Claude Code CLI sessions with tmux persistence.**

Run multiple Claude Code instances simultaneously, each in its own persistent tmux session that survives browser refreshes, pop-outs, and reconnections.

![Claudiator Dashboard](https://claudiator.app/screenshot.png)

## Table of Contents

- [Features](#features)
- [Authentication](#authentication)
- [Quick Start](#quick-start)
- [Installation](#installation)
  - [One-Liner Install (Linux/macOS)](#one-liner-install-linuxmacos)
  - [Manual Installation](#manual-installation)
  - [Docker Installation](#docker-installation)
- [Requirements](#requirements)
- [Configuration](#configuration)
- [Usage](#usage)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)
- [Security](#security)
- [Disclaimer](#disclaimer)
- [License](#license)

---

## Features

- **Token-Based Authentication** - Secure access with auto-generated tokens
- **Auto-Start Claude Code** - Claude Code launches automatically in each terminal
- **Project-Based Workflow** - Just enter a project name, folder is auto-created in `~/claudiator-projects`
- **Multi-Terminal Dashboard** - Run up to 16 Claude Code instances simultaneously in a grid layout
- **Session Persistence via tmux** - Each terminal runs in its own tmux session (`claudiator-{id}`), surviving:
  - Browser refresh
  - Pop-out to separate window
  - Pop back into main dashboard
  - Network disconnection and reconnection
- **Path Autocomplete** - Recent paths are saved (up to 25) and suggested as you type
- **Pop-Out Windows** - Pop terminals to separate windows that reconnect to the same tmux session
- **Bypass Permissions Default** - Configure permission bypass as the default for all new terminals
- **Flexible Grid Layout** - 1 to 4 column layouts, collapsible tiles
- **Terminal Grouping** - Organize terminals into color-coded groups
- **Works Standalone or Embedded** - Use as a standalone app or embed in your own projects

---

## Authentication

Claudiator requires authentication to protect your terminal sessions. An access token is automatically generated on first run.

### Finding Your Token

When Claudiator starts for the first time, the token is:
1. **Displayed in the terminal** with a visible banner
2. **Saved to**: `.local-storage/claudiator-token.json`

### Logging In

1. Navigate to `http://localhost:3200`
2. You'll be redirected to the login page
3. Enter your access token
4. Click "Login"

Your session is saved as a cookie (24 hours). You can logout from the dashboard.

### API Authentication

For programmatic access, include the token in your requests:

```bash
# Header authentication
curl -H "X-Claudiator-Token: YOUR_TOKEN" http://localhost:3200/api/sessions

# Query parameter (for SSE connections)
curl "http://localhost:3200/api/terminal?sessionId=abc&token=YOUR_TOKEN"
```

### Token Regeneration

To regenerate the access token:
1. Delete `.local-storage/claudiator-token.json`
2. Restart Claudiator

A new token will be generated and displayed.

---

## Quick Start

### One-Liner Install (Recommended)

```bash
curl -fsSL https://cdn.jsdelivr.net/gh/G-TechSD/claudiator@main/install.sh | bash
```

This installs Claudiator and all dependencies automatically (Node.js, tmux, git).

**The installer:**
- Auto-installs Node.js, tmux, and git if missing
- Configures your PATH automatically
- Creates the `claudiator` command
- Creates `~/claudiator-projects` for your projects
- Includes an uninstaller for easy removal

### Then run:

```bash
claudiator
```

Open [http://localhost:3200](http://localhost:3200) in your browser.

---

## Installation

### One-Liner Install (Linux/macOS)

The easiest way to install Claudiator:

```bash
curl -fsSL https://cdn.jsdelivr.net/gh/G-TechSD/claudiator@main/install.sh | bash
```

Or with wget:

```bash
wget -qO- https://cdn.jsdelivr.net/gh/G-TechSD/claudiator@main/install.sh | bash
```

**What the installer does:**

1. Checks for Node.js 18+ (prompts to install if missing)
2. Checks for tmux (prompts to install if missing)
3. Clones Claudiator to `~/.claudiator`
4. Installs dependencies via npm
5. Creates a `claudiator` command in your PATH
6. Optionally sets up systemd service for auto-start

**Manual one-liner:**

```bash
git clone https://github.com/G-TechSD/claudiator.git ~/.claudiator && cd ~/.claudiator && npm install && npm run build && npm start
```

### Manual Installation

1. **Clone the repository:**

```bash
git clone https://github.com/G-TechSD/claudiator.git
cd claudiator
```

2. **Install dependencies:**

```bash
npm install
```

3. **Build for production:**

```bash
npm run build
```

4. **Start the server:**

```bash
npm start
```

5. **Open in browser:**

Navigate to [http://localhost:3200](http://localhost:3200)

### Docker Installation

Docker is useful for isolated environments, but **for full Claude Code functionality, we recommend native installation** since Claude Code needs access to your host filesystem.

#### Option 1: Docker with Host Filesystem Access

This gives Claude Code full access to your host system (like native install):

```bash
docker run -d \
  --name claudiator \
  -p 3200:3200 \
  -v /:/host:rw \
  -v /var/run/docker.sock:/var/run/docker.sock \
  --privileged \
  gtechsd/claudiator:latest
```

**Warning:** This grants the container full access to your host filesystem. Only use in trusted environments or VMs.

#### Option 2: Docker with Limited Access

For safer operation with access only to specific directories:

```bash
docker run -d \
  --name claudiator \
  -p 3200:3200 \
  -v ~/projects:/projects:rw \
  -v ~/.ssh:/root/.ssh:ro \
  -v ~/.gitconfig:/root/.gitconfig:ro \
  gtechsd/claudiator:latest
```

#### Docker Compose

Create a `docker-compose.yml`:

```yaml
version: '3.8'
services:
  claudiator:
    image: gtechsd/claudiator:latest
    container_name: claudiator
    ports:
      - "3200:3200"
    volumes:
      # Full host access (use with caution):
      - /:/host:rw
      # Or limited access:
      # - ~/projects:/projects:rw
      # - ~/.ssh:/root/.ssh:ro
    privileged: true  # Required for full filesystem access
    restart: unless-stopped
    environment:
      - CLAUDIATOR_PORT=3200
      - CLAUDIATOR_TMUX_ENABLED=true
```

Then run:

```bash
docker-compose up -d
```

---

## Requirements

### Required

- **Node.js 18+** - [nodejs.org](https://nodejs.org/)
- **Claude Code CLI** - [anthropic.com/claude-code](https://claude.ai/claude-code)

### Recommended

- **tmux** - For session persistence (highly recommended)

### Installing tmux

**Ubuntu/Debian:**
```bash
sudo apt update && sudo apt install -y tmux
```

**macOS (Homebrew):**
```bash
brew install tmux
```

**Fedora/RHEL:**
```bash
sudo dnf install -y tmux
```

**Arch Linux:**
```bash
sudo pacman -S tmux
```

### Why tmux?

tmux (terminal multiplexer) allows Claudiator to:

1. **Persist sessions** - Claude Code continues running even if you close your browser
2. **Reconnect seamlessly** - Pop-out windows reconnect to the same session
3. **Survive disconnections** - Network issues don't kill your Claude Code session
4. **Share sessions** - Multiple windows can view the same session

**Without tmux:**
- Sessions are lost on browser close/refresh
- Pop-out windows start new sessions
- No reconnection support

**You can disable tmux** in Settings if:
- You can't install tmux
- You don't need persistence
- You're running in a restricted environment

---

## Configuration

### Environment Variables

Create a `.env.local` file in the Claudiator directory:

```bash
# Server port (default: 3200)
CLAUDIATOR_PORT=3200

# tmux session prefix (default: claudiator)
CLAUDIATOR_TMUX_PREFIX=claudiator

# Enable tmux by default (default: true)
CLAUDIATOR_TMUX_ENABLED=true

# Host for external access (default: auto-detect)
CLAUDIATOR_HOST=0.0.0.0
```

### Settings (UI)

Access settings via the gear icon in the dashboard:

| Setting | Description | Default |
|---------|-------------|---------|
| Session Persistence (tmux) | Use tmux for session persistence | On |
| Bypass Permissions | Enable permission bypass for new terminals | Off |
| Grid Columns | Number of columns in the grid layout | 2 |
| Theme | Light or dark mode | System |

### Storage

Claudiator stores data in localStorage:

| Key | Description |
|-----|-------------|
| `claudiator-terminals` | Active terminal sessions |
| `claudiator-settings` | User preferences |
| `claudiator-recent-paths` | Path autocomplete history (up to 25) |
| `claudiator-groups` | Terminal groups |

---

## Usage

### Creating a Project

1. Enter a project name in the input field (e.g., "my-awesome-app")
2. Press **Enter** or click **"New Project"**
3. A folder is automatically created in `~/claudiator-projects/my-awesome-app`
4. Claude Code starts automatically in the new terminal

**Custom location:** Click "Choose custom location" to specify a different path.

**Open existing project:** Click on any project button shown below the input to reopen it.

### Path Autocomplete

When entering a custom path:
- Start typing to see matching recent paths
- Use arrow keys to navigate suggestions
- Press `Enter` to select or create terminal
- Paths are automatically saved for future use

### Pop-Out Windows

Click the pop-out icon on any terminal tile to open it in a separate window. The window reconnects to the same tmux session, so:
- You see the same output
- Input in either window goes to the same session
- Closing the pop-out doesn't affect the session

### Terminal Groups

1. Click **"Actions" → "Create Group"**
2. Name your group and pick a color
3. Drag terminals into groups or use the tile menu

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New terminal |
| `Ctrl+]` | Collapse/expand current terminal |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            Multi-Terminal Dashboard                  │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │   │
│  │  │Terminal 1│  │Terminal 2│  │Terminal 3│          │   │
│  │  │(xterm.js)│  │(xterm.js)│  │(xterm.js)│          │   │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘          │   │
│  └───────│─────────────│─────────────│─────────────────┘   │
└──────────│─────────────│─────────────│─────────────────────┘
           │             │             │
           │  SSE/HTTP   │             │
           ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Next.js API Server                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                Terminal Server                       │   │
│  │   • node-pty for pseudo-terminal                    │   │
│  │   • tmux session management                         │   │
│  │   • SSE streaming for output                        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
           │             │             │
           ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────┐
│                       tmux Sessions                          │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐     │
│  │claudiator-abc │ │claudiator-def │ │claudiator-ghi │     │
│  │  claude code  │ │  claude code  │ │  claude code  │     │
│  └───────────────┘ └───────────────┘ └───────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS, shadcn/ui
- **Terminal**: xterm.js with WebGL renderer, xterm-addon-fit
- **Backend**: Next.js API routes, node-pty, tmux
- **State**: React Context, localStorage

### tmux Session Naming

Each terminal gets a unique tmux session:
- Pattern: `claudiator-{8-char-id}`
- Example: `claudiator-a1b2c3d4`

Check active sessions:
```bash
tmux ls | grep claudiator
```

---

## API Reference

### POST /api/terminal

Create a new terminal session.

**Request:**
```json
{
  "workingDirectory": "/path/to/project",
  "label": "My Terminal",
  "useTmux": true,
  "bypassPermissions": false
}
```

**Response:**
```json
{
  "sessionId": "a1b2c3d4",
  "tmux": {
    "enabled": true,
    "sessionName": "claudiator-a1b2c3d4"
  }
}
```

### PUT /api/terminal

Send input, resize, or reconnect.

**Input:**
```json
{
  "sessionId": "a1b2c3d4",
  "type": "input",
  "data": "ls -la\n"
}
```

**Resize:**
```json
{
  "sessionId": "a1b2c3d4",
  "type": "resize",
  "cols": 120,
  "rows": 40
}
```

**Reconnect (tmux):**
```json
{
  "sessionId": "a1b2c3d4",
  "type": "reconnect",
  "tmuxSessionName": "claudiator-a1b2c3d4"
}
```

### DELETE /api/terminal

Stop a terminal session.

```
DELETE /api/terminal?sessionId=a1b2c3d4
DELETE /api/terminal?sessionId=a1b2c3d4&killTmux=true  # Also kill tmux session
```

### GET /api/terminal

Stream terminal output via Server-Sent Events (SSE).

```
GET /api/terminal?sessionId=a1b2c3d4
```

### GET /api/sessions

List all active sessions.

**Response:**
```json
{
  "sessions": [
    {
      "id": "a1b2c3d4",
      "label": "My Terminal",
      "workingDirectory": "/path/to/project",
      "tmuxSession": "claudiator-a1b2c3d4"
    }
  ]
}
```

### DELETE /api/sessions

Kill all sessions.

```
DELETE /api/sessions?all=true
```

### GET /api/health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "tmuxAvailable": true,
  "activeSessions": 3
}
```

---

## Troubleshooting

### "tmux: command not found"

Install tmux using the instructions in [Requirements](#installing-tmux), or disable tmux in Settings.

### Session lost on refresh

1. Ensure tmux is installed and working: `tmux -V`
2. Check tmux is enabled in Settings
3. Check if session exists: `tmux ls | grep claudiator`

### Terminal not connecting

1. Check the server is running: `curl http://localhost:3200/api/health`
2. Check browser console for errors
3. Try refreshing the page

### Pop-out window shows new session

This happens if:
- tmux is disabled
- tmux session was killed
- Browser blocked cross-window communication

### High memory usage

Each Claude Code instance uses memory. With 16 terminals:
- Recommended: 16+ GB RAM
- Minimum: 8 GB RAM

### Port already in use

```bash
# Find process using port 3200
lsof -i :3200

# Kill it
kill -9 <PID>

# Or use a different port
CLAUDIATOR_PORT=3201 npm start
```

---

## Security

### Important Security Information

**READ THIS CAREFULLY BEFORE USING CLAUDIATOR**

Claudiator provides a web interface to spawn and control terminal sessions running Claude Code. This is an inherently powerful and potentially dangerous capability. Understanding the security model is essential.

### What Claudiator Can Do

When authenticated, users can:
- **Execute arbitrary shell commands** via Claude Code
- **Read, write, and delete any files** accessible to the user running Claudiator
- **Access the network** from the server
- **Install software** if the user has appropriate permissions
- **Spawn multiple concurrent AI agents** with full system access

### Authentication Model

Claudiator uses token-based authentication:

| Component | Description |
|-----------|-------------|
| **Access Token** | 64-character cryptographically random hex string |
| **Token Storage** | `.local-storage/claudiator-token.json` (server-side only) |
| **Session Cookie** | `claudiator_session` - httpOnly, 24-hour expiry |
| **API Auth** | `X-Claudiator-Token` header or `?token=` query param |

### Security Limitations

**The authentication system has limitations you must understand:**

1. **Single Token** - All users share the same access token. There is no user-level access control.

2. **No Encryption by Default** - Claudiator runs on HTTP by default. Use a reverse proxy (nginx, Caddy) with TLS for HTTPS.

3. **Token in Memory** - Active sessions are stored in server memory. Server restart clears all sessions.

4. **No Rate Limiting** - There is no built-in protection against brute-force token guessing.

5. **Local Network Exposure** - By default, Claudiator binds to `0.0.0.0`, making it accessible on your local network.

6. **No Audit Logging** - Commands executed through Claude Code are not logged by Claudiator.

### Security Best Practices

#### Network Security

```bash
# Bind to localhost only (recommended for single-user)
CLAUDIATOR_HOST=127.0.0.1 npm start

# Use a firewall to restrict access
sudo ufw allow from 192.168.1.0/24 to any port 3200
```

#### Use HTTPS in Production

For any non-localhost deployment, use a reverse proxy with TLS:

```nginx
# Example nginx config
server {
    listen 443 ssl;
    server_name claudiator.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://127.0.0.1:3200;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

#### Token Management

- **Never share your token** in screenshots, logs, or public channels
- **Regenerate the token** if you suspect it has been compromised (delete `.local-storage/claudiator-token.json` and restart)
- **Use environment variables** for automated deployments instead of hardcoding tokens

#### Run in Isolation

**Strongly recommended:** Run Claudiator in an isolated environment:

1. **Virtual Machine** - Preferred for maximum isolation
2. **Docker Container** - With limited volume mounts
3. **Dedicated User Account** - With restricted permissions
4. **Sandboxed Environment** - Cloud VM, etc.

### Recommended VM Specs

| Use Case | RAM | CPU | Storage |
|----------|-----|-----|---------|
| Light (1-2 terminals) | 8 GB | 2 cores | 50 GB |
| Medium (3-8 terminals) | 16 GB | 4 cores | 100 GB |
| Heavy (9-16 terminals) | 32 GB | 8 cores | 200 GB |

### VM Options

- **Multipass** (Ubuntu): `multipass launch --memory 16G --cpus 4 --disk 100G`
- **Lima** (macOS): `lima create --memory 16 --cpus 4 --disk 100`
- **VirtualBox**: Create VM with recommended specs
- **Cloud**: AWS EC2, GCP Compute, Azure VM

### Security Checklist

Before deploying Claudiator, verify:

- [ ] Running on localhost OR behind HTTPS reverse proxy
- [ ] Firewall configured to restrict access
- [ ] Running as non-root user
- [ ] Running in VM/container OR on dedicated machine
- [ ] Token stored securely and not shared
- [ ] Regular snapshots/backups configured
- [ ] Understood that Claude Code has full system access

---

## Disclaimer

### Beta Software Notice

**CLAUDIATOR IS BETA SOFTWARE DEVELOPED WITH AI ASSISTANCE**

This software is provided in beta form and is under active development. It was developed with significant assistance from AI (Claude by Anthropic).

### No Warranty

THIS SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.

### Limitation of Liability

IN NO EVENT SHALL THE AUTHORS, CONTRIBUTORS, OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

### Specific Risks

By using Claudiator, you acknowledge and accept the following risks:

1. **Data Loss** - Claude Code can modify or delete files. Always maintain backups.

2. **System Damage** - Incorrect commands can damage your system, corrupt data, or cause instability.

3. **Security Breaches** - Misconfiguration could expose your system to unauthorized access.

4. **Unintended Actions** - AI models can misinterpret instructions and take unexpected actions.

5. **Resource Consumption** - Multiple Claude Code instances can consume significant CPU, memory, and API credits.

6. **Network Actions** - Claude Code can make network requests, potentially exposing data or triggering external services.

### Your Responsibility

You are solely responsible for:

- Securing your Claudiator installation
- Backing up your data before using Claude Code
- Reviewing actions taken by Claude Code
- Ensuring compliance with applicable laws and regulations
- Any costs incurred (API usage, cloud resources, etc.)
- Any damage to your systems, data, or third-party systems

### AI-Generated Code Notice

Portions of this software were generated or modified by AI. While efforts have been made to ensure correctness and security, AI-generated code may contain:

- Bugs or logical errors
- Security vulnerabilities
- Unexpected behaviors
- Incomplete implementations

**Always review AI-generated code before using in production environments.**

### Not for Production Critical Systems

Claudiator is **NOT recommended** for:

- Production servers with sensitive data
- Systems without proper backups
- Environments requiring high availability
- Compliance-regulated environments (HIPAA, PCI-DSS, etc.)
- Systems you cannot afford to rebuild

### Acceptance

By installing, running, or using Claudiator, you acknowledge that you have read, understood, and agree to this disclaimer. If you do not agree, do not use this software.

---

## Development

```bash
# Clone
git clone https://github.com/G-TechSD/claudiator.git
cd claudiator

# Install
npm install

# Dev server with hot reload
npm run dev

# Build
npm run build

# Production
npm start

# Lint
npm run lint
```

---

## Uninstalling

To completely remove Claudiator:

```bash
claudiator uninstall
```

Or run the uninstaller directly:

```bash
~/.claudiator/uninstall.sh
```

**The uninstaller:**
- Stops any running Claudiator instances
- Kills all Claudiator tmux sessions
- Removes the installation directory (`~/.claudiator`)
- Removes the `claudiator` command
- Optionally removes your projects directory (`~/claudiator-projects`)
- Cleans up shell configuration

---

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push: `git push origin feature/amazing`
5. Open a Pull Request

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Links

- **Website**: [claudiator.app](https://claudiator.app)
- **GitHub**: [github.com/G-TechSD/claudiator](https://github.com/G-TechSD/claudiator)
- **Issues**: [github.com/G-TechSD/claudiator/issues](https://github.com/G-TechSD/claudiator/issues)
- **Claudia Coder**: [claudiacoder.com](https://claudiacoder.com)

---

Made with ❤️ for the Claude Code community
