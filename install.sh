#!/bin/bash
#
# Claudiator Installer
# Multi-terminal management for Claude Code CLI sessions
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/G-TechSD/claudiator/main/install.sh | bash
#   wget -qO- https://raw.githubusercontent.com/G-TechSD/claudiator/main/install.sh | bash
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Configuration
INSTALL_DIR="${CLAUDIATOR_INSTALL_DIR:-$HOME/.claudiator}"
REPO_URL="https://github.com/G-TechSD/claudiator.git"
MIN_NODE_VERSION=18
PORT="${CLAUDIATOR_PORT:-3200}"

# Print banner
print_banner() {
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════╗"
    echo "║                                                    ║"
    echo "║       ╔═╗╦  ╔═╗╦ ╦╔╦╗╦╔═╗╔╦╗╔═╗╦═╗                ║"
    echo "║       ║  ║  ╠═╣║ ║ ║║║╠═╣ ║ ║ ║╠╦╝                ║"
    echo "║       ╚═╝╩═╝╩ ╩╚═╝═╩╝╩╩ ╩ ╩ ╚═╝╩╚═                ║"
    echo "║                                                    ║"
    echo "║    Multi-Terminal Management for Claude Code       ║"
    echo "║                                                    ║"
    echo "╚════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Get OS type
get_os() {
    case "$(uname -s)" in
        Linux*)  echo "linux";;
        Darwin*) echo "macos";;
        *)       echo "unknown";;
    esac
}

# Install Homebrew on macOS if missing
install_homebrew() {
    log_info "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" </dev/null

    # Add brew to PATH for current session
    if [ -f "/opt/homebrew/bin/brew" ]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
    elif [ -f "/usr/local/bin/brew" ]; then
        eval "$(/usr/local/bin/brew shellenv)"
    fi

    log_success "Homebrew installed"
}

# Get package manager
get_package_manager() {
    local os=$(get_os)

    if [ "$os" = "macos" ]; then
        if command_exists brew; then
            echo "brew"
        else
            # Auto-install Homebrew on macOS
            install_homebrew
            echo "brew"
        fi
    elif [ "$os" = "linux" ]; then
        if command_exists apt-get; then
            echo "apt"
        elif command_exists dnf; then
            echo "dnf"
        elif command_exists yum; then
            echo "yum"
        elif command_exists pacman; then
            echo "pacman"
        elif command_exists apk; then
            echo "apk"
        else
            echo "none"
        fi
    else
        echo "none"
    fi
}

# Check Node.js version
check_node() {
    if ! command_exists node; then
        return 1
    fi

    local version=$(node -v | sed 's/v//' | cut -d. -f1)
    if [ "$version" -lt "$MIN_NODE_VERSION" ]; then
        return 1
    fi

    return 0
}

# Install Node.js
install_node() {
    local pm=$(get_package_manager)
    local os=$(get_os)

    log_info "Installing Node.js..."

    case "$pm" in
        brew)
            brew install node@20
            brew link --overwrite node@20 2>/dev/null || true
            ;;
        apt)
            # Use NodeSource for latest Node.js
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
            sudo apt-get install -y nodejs
            ;;
        dnf|yum)
            curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
            sudo $pm install -y nodejs
            ;;
        pacman)
            sudo pacman -S --noconfirm nodejs npm
            ;;
        apk)
            sudo apk add --no-cache nodejs npm
            ;;
        *)
            log_error "Could not install Node.js automatically."
            log_info "Please install Node.js 18+ manually: https://nodejs.org/"
            exit 1
            ;;
    esac

    log_success "Node.js installed: $(node -v)"
}

# Check tmux
check_tmux() {
    command_exists tmux
}

# Install tmux
install_tmux() {
    local pm=$(get_package_manager)

    log_info "Installing tmux..."

    case "$pm" in
        brew)
            brew install tmux
            ;;
        apt)
            sudo apt-get update && sudo apt-get install -y tmux
            ;;
        dnf|yum)
            sudo $pm install -y tmux
            ;;
        pacman)
            sudo pacman -S --noconfirm tmux
            ;;
        apk)
            sudo apk add --no-cache tmux
            ;;
        *)
            log_warn "Could not install tmux automatically."
            log_info "Please install tmux manually for session persistence."
            return 1
            ;;
    esac

    log_success "tmux installed: $(tmux -V)"
}

# Check Claude Code CLI
check_claude_code() {
    command_exists claude
}

# Get npm global bin directory
get_npm_bin() {
    local npm_prefix=$(npm config get prefix 2>/dev/null)
    if [ -n "$npm_prefix" ]; then
        echo "$npm_prefix/bin"
    else
        echo ""
    fi
}

# Add npm global bin to PATH
setup_npm_path() {
    local npm_bin=$(get_npm_bin)
    if [ -z "$npm_bin" ]; then
        return
    fi

    # Add to current session
    if [[ ":$PATH:" != *":$npm_bin:"* ]]; then
        export PATH="$npm_bin:$PATH"
        log_info "Added $npm_bin to PATH for current session"
    fi

    # Add to shell rc if not already there
    local shell_rc=$(get_shell_rc)
    if ! grep -q "npm.*bin" "$shell_rc" 2>/dev/null; then
        echo "" >> "$shell_rc"
        echo "# npm global bin (for Claude Code CLI)" >> "$shell_rc"
        echo "export PATH=\"\$(npm config get prefix)/bin:\$PATH\"" >> "$shell_rc"
        log_info "Added npm global bin to $shell_rc"
    fi
}

# Check if npm global install needs sudo
npm_needs_sudo() {
    local npm_prefix=$(npm config get prefix 2>/dev/null)
    if [ -z "$npm_prefix" ]; then
        return 0  # Assume needs sudo if we can't determine
    fi
    # Check if we can write to npm global directory
    if [ -w "$npm_prefix/lib/node_modules" ] 2>/dev/null; then
        return 1  # No sudo needed
    fi
    return 0  # Needs sudo
}

# Install Claude Code CLI
install_claude_code() {
    log_info "Installing Claude Code CLI..."

    # Claude Code is installed via npm globally
    if npm_needs_sudo; then
        log_info "Global npm directory requires sudo..."
        sudo npm install -g @anthropic-ai/claude-code
    else
        npm install -g @anthropic-ai/claude-code
    fi

    # Ensure npm global bin is in PATH
    setup_npm_path

    if check_claude_code; then
        log_success "Claude Code CLI installed: $(claude --version 2>/dev/null || echo 'installed')"
    else
        log_warn "Claude Code CLI installation may require a new terminal session"
        log_info "You can also install manually: sudo npm install -g @anthropic-ai/claude-code"
    fi
}

# Check git
check_git() {
    command_exists git
}

# Install git
install_git() {
    local pm=$(get_package_manager)

    log_info "Installing git..."

    case "$pm" in
        brew)
            brew install git
            ;;
        apt)
            sudo apt-get update && sudo apt-get install -y git
            ;;
        dnf|yum)
            sudo $pm install -y git
            ;;
        pacman)
            sudo pacman -S --noconfirm git
            ;;
        apk)
            sudo apk add --no-cache git
            ;;
        *)
            log_error "Could not install git automatically."
            log_info "Please install git manually."
            exit 1
            ;;
    esac

    log_success "git installed: $(git --version)"
}

# Get shell config file
get_shell_rc() {
    if [ -n "$ZSH_VERSION" ] || [ "$SHELL" = "/bin/zsh" ] || [ "$SHELL" = "/usr/bin/zsh" ]; then
        echo "$HOME/.zshrc"
    elif [ -n "$BASH_VERSION" ] || [ "$SHELL" = "/bin/bash" ] || [ "$SHELL" = "/usr/bin/bash" ]; then
        echo "$HOME/.bashrc"
    elif [ -f "$HOME/.zshrc" ]; then
        echo "$HOME/.zshrc"
    elif [ -f "$HOME/.bashrc" ]; then
        echo "$HOME/.bashrc"
    else
        echo "$HOME/.profile"
    fi
}

# Create claudiator command
create_command() {
    local bin_dir="$HOME/.local/bin"
    local cmd_file="$bin_dir/claudiator"

    # Create bin directory if it doesn't exist
    mkdir -p "$bin_dir"

    # Create the command script
    cat > "$cmd_file" << 'SCRIPT'
#!/bin/bash
INSTALL_DIR="${CLAUDIATOR_INSTALL_DIR:-$HOME/.claudiator}"
PORT="${CLAUDIATOR_PORT:-3200}"

check_claude_installed() {
    # First, check if npm global bin is in PATH
    local npm_bin=$(npm config get prefix 2>/dev/null)/bin
    if [ -d "$npm_bin" ] && [[ ":$PATH:" != *":$npm_bin:"* ]]; then
        export PATH="$npm_bin:$PATH"
    fi

    if ! command -v claude >/dev/null 2>&1; then
        echo ""
        echo "╔════════════════════════════════════════════════════════════════╗"
        echo "║  Claude Code CLI not found!                                    ║"
        echo "║                                                                ║"
        echo "║  Claudiator requires Claude Code CLI to manage terminals.      ║"
        echo "║                                                                ║"
        echo "║  Installing now...                                             ║"
        echo "╚════════════════════════════════════════════════════════════════╝"
        echo ""

        # Check if we need sudo for npm global install
        local npm_prefix=$(npm config get prefix 2>/dev/null)
        if [ -w "$npm_prefix/lib/node_modules" ] 2>/dev/null; then
            npm install -g @anthropic-ai/claude-code
        else
            echo "Global npm directory requires sudo..."
            sudo npm install -g @anthropic-ai/claude-code
        fi

        # Add npm bin to PATH for this session
        npm_bin=$(npm config get prefix 2>/dev/null)/bin
        if [ -d "$npm_bin" ]; then
            export PATH="$npm_bin:$PATH"
        fi

        if ! command -v claude >/dev/null 2>&1; then
            echo ""
            echo "Installation may require a new terminal. Please run:"
            echo "  sudo npm install -g @anthropic-ai/claude-code"
            echo ""
            echo "Add to your shell config:"
            echo "  export PATH=\"\$(npm config get prefix)/bin:\$PATH\""
            echo ""
            echo "Then try again: claudiator start"
            exit 1
        fi
        echo ""
        echo "Claude Code CLI installed successfully!"
        echo ""
    fi
}

case "$1" in
    start|"")
        check_claude_installed
        cd "$INSTALL_DIR"
        node scripts/show-token.js
        echo "Starting Claudiator on http://localhost:$PORT ..."
        echo "Press Ctrl+C to stop"
        echo ""
        exec npx next start --port "$PORT"
        ;;
    dev)
        cd "$INSTALL_DIR"
        echo "Starting Claudiator in development mode..."
        npm run dev
        ;;
    stop)
        pkill -f "next.*claudiator" 2>/dev/null || echo "Claudiator not running"
        ;;
    status)
        if curl -s "http://localhost:$PORT/api/health" > /dev/null 2>&1; then
            echo "Claudiator is running on http://localhost:$PORT"
        else
            echo "Claudiator is not running"
        fi
        ;;
    token)
        cd "$INSTALL_DIR"
        node scripts/show-token.js
        ;;
    update)
        echo "Updating Claudiator..."
        cd "$INSTALL_DIR"
        git pull
        # Re-run installer to update command script and dependencies
        bash "$INSTALL_DIR/install.sh"
        ;;
    uninstall)
        "$INSTALL_DIR/uninstall.sh"
        ;;
    remote)
        check_claude_installed
        cd "$INSTALL_DIR"
        node scripts/show-token.js
        echo "Starting Claudiator with REMOTE ACCESS ENABLED..."
        echo ""
        echo "  WARNING: Remote access is enabled without SSL/HTTPS."
        echo "  Only use on trusted networks or behind a reverse proxy with TLS."
        echo ""
        echo "Press Ctrl+C to stop"
        echo ""
        CLAUDIATOR_ALLOW_REMOTE=true exec npx next start --port "$PORT"
        ;;
    *)
        echo "Claudiator - Multi-Terminal Management for Claude Code"
        echo ""
        echo "Usage: claudiator [command]"
        echo ""
        echo "Commands:"
        echo "  start       Start server (localhost only - secure default)"
        echo "  remote      Start server with remote access (use with caution)"
        echo "  stop        Stop Claudiator server"
        echo "  status      Check if Claudiator is running"
        echo "  token       Show access token for login"
        echo "  update      Update to latest version"
        echo "  uninstall   Remove Claudiator completely"
        echo "  dev         Start in development mode"
        echo ""
        echo "Environment variables:"
        echo "  CLAUDIATOR_PORT=3200           Server port"
        echo "  CLAUDIATOR_ALLOW_REMOTE=true   Enable remote access"
        echo ""
        echo "After starting, open http://localhost:$PORT in your browser"
        echo "Use 'claudiator token' to get your login token"
        echo ""
        echo "Security: By default, only localhost can connect."
        echo "Use 'claudiator remote' or set CLAUDIATOR_ALLOW_REMOTE=true"
        echo "to allow connections from other computers."
        echo "Note: SSL/HTTPS is NOT supported - use a reverse proxy for secure remote access."
        ;;
esac
SCRIPT

    chmod +x "$cmd_file"
    log_success "Created 'claudiator' command"
}

# Create uninstaller script
create_uninstaller() {
    local uninstall_file="$INSTALL_DIR/uninstall.sh"

    cat > "$uninstall_file" << 'UNINSTALL'
#!/bin/bash
#
# Claudiator Uninstaller
#

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

INSTALL_DIR="${CLAUDIATOR_INSTALL_DIR:-$HOME/.claudiator}"
BIN_FILE="$HOME/.local/bin/claudiator"
PROJECTS_DIR="$HOME/claudiator-projects"

echo -e "${YELLOW}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║             Claudiator Uninstaller                        ║${NC}"
echo -e "${YELLOW}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Stop any running instances
echo "Stopping Claudiator..."
pkill -f "next.*claudiator" 2>/dev/null || true

# Kill tmux sessions
echo "Cleaning up tmux sessions..."
tmux list-sessions -F "#{session_name}" 2>/dev/null | grep "^claudiator" | while read session; do
    tmux kill-session -t "$session" 2>/dev/null || true
done

# Remove installation directory
if [ -d "$INSTALL_DIR" ]; then
    echo "Removing installation directory: $INSTALL_DIR"
    rm -rf "$INSTALL_DIR"
fi

# Remove command
if [ -f "$BIN_FILE" ]; then
    echo "Removing claudiator command"
    rm -f "$BIN_FILE"
fi

# Ask about projects directory
if [ -d "$PROJECTS_DIR" ]; then
    echo ""
    echo -e "${YELLOW}Found projects directory: $PROJECTS_DIR${NC}"
    read -p "Delete project files? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$PROJECTS_DIR"
        echo "Deleted projects directory"
    else
        echo "Keeping projects directory"
    fi
fi

# Remove from shell rc (optional - just comment it out)
for rc_file in "$HOME/.bashrc" "$HOME/.zshrc" "$HOME/.profile"; do
    if [ -f "$rc_file" ]; then
        if grep -q "# Claudiator" "$rc_file"; then
            sed -i.bak '/# Claudiator/,+1d' "$rc_file" 2>/dev/null || true
        fi
    fi
done

echo ""
echo -e "${GREEN}Claudiator has been uninstalled.${NC}"
echo ""
echo "Note: To reinstall, run:"
echo "  curl -fsSL https://cdn.jsdelivr.net/gh/G-TechSD/claudiator@main/install.sh | bash"
UNINSTALL

    chmod +x "$uninstall_file"
    log_success "Created uninstaller at $uninstall_file"
}

# Add PATH to shell config
setup_path() {
    local bin_dir="$HOME/.local/bin"
    local shell_rc=$(get_shell_rc)

    # Check if PATH already contains bin_dir
    if [[ ":$PATH:" == *":$bin_dir:"* ]]; then
        log_success "PATH already configured"
        return
    fi

    # Add to shell rc if not already there
    if ! grep -q "# Claudiator" "$shell_rc" 2>/dev/null; then
        echo "" >> "$shell_rc"
        echo "# Claudiator" >> "$shell_rc"
        echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$shell_rc"
        log_info "Added PATH to $shell_rc"
    fi

    # Export for current session
    export PATH="$bin_dir:$PATH"
    log_success "PATH configured for current session"
}

# Create projects directory
create_projects_dir() {
    local projects_dir="$HOME/claudiator-projects"
    if [ ! -d "$projects_dir" ]; then
        mkdir -p "$projects_dir"
        log_success "Created projects directory: $projects_dir"
    fi
}

# Main installation
main() {
    print_banner

    local os=$(get_os)
    if [ "$os" = "unknown" ]; then
        log_error "Unsupported operating system"
        exit 1
    fi

    log_info "Detected OS: $os"
    log_info "Install directory: $INSTALL_DIR"
    echo

    # Check dependencies
    log_info "Checking and installing dependencies..."

    # Git - auto-install
    if ! check_git; then
        install_git
    else
        log_success "git found: $(git --version | head -1)"
    fi

    # Node.js - auto-install if missing
    if ! check_node; then
        log_warn "Node.js $MIN_NODE_VERSION+ not found, installing automatically..."
        install_node
    else
        log_success "Node.js found: $(node -v)"
    fi

    # tmux - auto-install (recommended for session persistence)
    if ! check_tmux; then
        log_info "Installing tmux for session persistence..."
        install_tmux || log_warn "tmux installation failed - you can disable tmux in Claudiator settings"
    else
        log_success "tmux found: $(tmux -V)"
    fi

    # Claude Code CLI - auto-install (required for Claudiator)
    if ! check_claude_code; then
        log_warn "Claude Code CLI not found, installing automatically..."
        install_claude_code
    else
        log_success "Claude Code CLI found: $(claude --version 2>/dev/null || echo 'installed')"
    fi

    echo

    # Clone or update repository
    if [ -d "$INSTALL_DIR" ]; then
        log_info "Claudiator already installed, updating..."
        cd "$INSTALL_DIR"
        git pull
    else
        log_info "Cloning Claudiator..."
        git clone "$REPO_URL" "$INSTALL_DIR"
        cd "$INSTALL_DIR"
    fi

    # Install npm dependencies
    log_info "Installing dependencies..."
    npm install --production=false

    # Build
    log_info "Building Claudiator..."
    npm run build

    # Create command
    create_command

    # Setup PATH (adds to shell rc AND current session)
    setup_path

    # Create uninstaller
    create_uninstaller

    # Create default projects directory
    create_projects_dir

    echo
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                           ║${NC}"
    echo -e "${GREEN}║          ${BOLD}Claudiator installed successfully!${NC}${GREEN}              ║${NC}"
    echo -e "${GREEN}║                                                           ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo
    echo -e "  ${BOLD}To start Claudiator:${NC}"
    echo -e "    ${CYAN}claudiator${NC}"
    echo
    echo -e "  ${BOLD}Then open in your browser:${NC}"
    echo -e "    ${CYAN}http://localhost:$PORT${NC}"
    echo
    echo -e "  ${BOLD}Commands:${NC}"
    echo -e "    ${CYAN}claudiator${NC}           - Start the server"
    echo -e "    ${CYAN}claudiator stop${NC}      - Stop the server"
    echo -e "    ${CYAN}claudiator status${NC}    - Check if running"
    echo -e "    ${CYAN}claudiator update${NC}    - Update to latest version"
    echo -e "    ${CYAN}claudiator uninstall${NC} - Remove Claudiator"
    echo
    echo -e "  ${BOLD}Projects are saved to:${NC}"
    echo -e "    ${CYAN}~/claudiator-projects${NC}"
    echo
    echo -e "  ${BOLD}Documentation:${NC} https://github.com/G-TechSD/claudiator"
    echo
}

# Run main function
main "$@"
