# Claudiator

**Multi-terminal management for Claude Code CLI sessions with tmux persistence.**

Run multiple Claude Code instances simultaneously, each in its own persistent tmux session that survives browser refreshes, pop-outs, and reconnections.

![Claudiator Dashboard](https://claudiator.app/screenshot.png)

## Table of Contents

- [Features](#features)
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
- [Safety Recommendations](#safety-recommendations)
- [License](#license)

---

## Features

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

## Safety Recommendations

### Use a Virtual Machine

**Strongly recommended for production use:**

Claude Code has powerful capabilities including file system access and code execution. For safety:

1. **Run in a VM** with 8-32 GB RAM and adequate CPU
2. **Snapshot frequently** to restore from mistakes
3. **Limit network access** if not needed
4. **Use Docker** with limited volume mounts for isolation

### Recommended VM Specs

| Use Case | RAM | CPU | Storage |
|----------|-----|-----|---------|
| Light (1-2 terminals) | 8 GB | 2 cores | 50 GB |
| Medium (3-8 terminals) | 16 GB | 4 cores | 100 GB |
| Heavy (9-16 terminals) | 32 GB | 8 cores | 200 GB |

### GPU/VRAM

**Claudiator itself doesn't require GPU.** However, if you're running local AI models alongside Claude Code:
- 8 GB VRAM minimum for small models
- 16-32 GB VRAM for larger models

### VM Options

- **Multipass** (Ubuntu): `multipass launch --memory 16G --cpus 4 --disk 100G`
- **Lima** (macOS): `lima create --memory 16 --cpus 4 --disk 100`
- **VirtualBox**: Create VM with recommended specs
- **Cloud**: AWS EC2, GCP Compute, Azure VM

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
