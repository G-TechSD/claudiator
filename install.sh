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
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║                                                           ║"
    echo "║     ██████╗██╗      █████╗ ██╗   ██╗██████╗ ██╗ █████╗   ║"
    echo "║    ██╔════╝██║     ██╔══██╗██║   ██║██╔══██╗██║██╔══██╗  ║"
    echo "║    ██║     ██║     ███████║██║   ██║██║  ██║██║███████║  ║"
    echo "║    ██║     ██║     ██╔══██║██║   ██║██║  ██║██║██╔══██║  ║"
    echo "║    ╚██████╗███████╗██║  ██║╚██████╔╝██████╔╝██║██║  ██║  ║"
    echo "║     ╚═════╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚═╝╚═╝  ╚═╝  ║"
    echo "║                        TOR                                ║"
    echo "║                                                           ║"
    echo "║        Multi-Terminal Management for Claude Code          ║"
    echo "║                                                           ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
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
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

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

case "$1" in
    start|"")
        cd "$INSTALL_DIR"
        echo "Starting Claudiator on port $PORT..."
        npm start
        ;;
    dev)
        cd "$INSTALL_DIR"
        echo "Starting Claudiator in development mode..."
        npm run dev
        ;;
    stop)
        pkill -f "claudiator" 2>/dev/null || echo "Claudiator not running"
        ;;
    status)
        if curl -s "http://localhost:$PORT/api/health" > /dev/null 2>&1; then
            echo "Claudiator is running on port $PORT"
        else
            echo "Claudiator is not running"
        fi
        ;;
    update)
        cd "$INSTALL_DIR"
        git pull
        npm install
        npm run build
        echo "Claudiator updated successfully!"
        ;;
    uninstall)
        echo "Uninstalling Claudiator..."
        rm -rf "$INSTALL_DIR"
        rm -f "$HOME/.local/bin/claudiator"
        echo "Claudiator uninstalled"
        ;;
    *)
        echo "Usage: claudiator [start|dev|stop|status|update|uninstall]"
        ;;
esac
SCRIPT

    chmod +x "$cmd_file"

    # Add to PATH if not already there
    if [[ ":$PATH:" != *":$bin_dir:"* ]]; then
        local shell_rc=""
        if [ -f "$HOME/.zshrc" ]; then
            shell_rc="$HOME/.zshrc"
        elif [ -f "$HOME/.bashrc" ]; then
            shell_rc="$HOME/.bashrc"
        fi

        if [ -n "$shell_rc" ]; then
            echo "" >> "$shell_rc"
            echo "# Claudiator" >> "$shell_rc"
            echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$shell_rc"
            log_info "Added ~/.local/bin to PATH in $shell_rc"
            log_warn "Please run: source $shell_rc"
        fi
    fi

    log_success "Created 'claudiator' command"
}

# Create systemd service (Linux only) - optional, not auto-enabled
create_systemd_service() {
    if [ "$(get_os)" != "linux" ]; then
        return
    fi

    # Don't auto-create systemd service, but provide instructions
    log_info "To enable auto-start on boot, run: claudiator enable-service"
}

# Actually create the systemd service (called by claudiator enable-service)
setup_systemd_service() {
    local service_file="$HOME/.config/systemd/user/claudiator.service"
    mkdir -p "$(dirname "$service_file")"

    cat > "$service_file" << SERVICE
[Unit]
Description=Claudiator - Multi-Terminal Management for Claude Code
After=network.target

[Service]
Type=simple
WorkingDirectory=$INSTALL_DIR
ExecStart=$(which node) $INSTALL_DIR/node_modules/.bin/next start -p $PORT
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=$PORT

[Install]
WantedBy=default.target
SERVICE

    systemctl --user daemon-reload
    systemctl --user enable claudiator

    log_success "Systemd service created and enabled"
    log_info "Start with: systemctl --user start claudiator"
    log_info "Stop with: systemctl --user stop claudiator"
    log_info "Logs with: journalctl --user -u claudiator -f"
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
    log_info "Checking dependencies..."

    # Git
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

    # Optionally set up systemd
    create_systemd_service

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
    echo -e "  ${BOLD}Other commands:${NC}"
    echo -e "    ${CYAN}claudiator start${NC}     - Start the server"
    echo -e "    ${CYAN}claudiator stop${NC}      - Stop the server"
    echo -e "    ${CYAN}claudiator status${NC}    - Check if running"
    echo -e "    ${CYAN}claudiator update${NC}    - Update to latest version"
    echo -e "    ${CYAN}claudiator uninstall${NC} - Remove Claudiator"
    echo

    if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
        echo -e "  ${YELLOW}Note: Run this to use the claudiator command now:${NC}"
        echo -e "    ${CYAN}export PATH=\"\$HOME/.local/bin:\$PATH\"${NC}"
        echo
    fi

    echo -e "  ${BOLD}Documentation:${NC} https://claudiator.app"
    echo -e "  ${BOLD}GitHub:${NC} https://github.com/G-TechSD/claudiator"
    echo
}

# Run main function
main "$@"
