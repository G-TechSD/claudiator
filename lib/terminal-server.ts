/**
 * Terminal Server Module
 *
 * Manages terminal sessions with tmux integration for persistence.
 * Each terminal gets its own tmux session named `claudiator-{id}`.
 */

import * as pty from "node-pty"
import * as os from "os"
import { execSync } from "child_process"

// Session naming
const TMUX_SESSION_PREFIX = "claudiator"

// Check if tmux is available
let tmuxAvailable: boolean | null = null

export function isTmuxAvailable(): boolean {
  if (tmuxAvailable !== null) return tmuxAvailable

  try {
    execSync("which tmux", { stdio: "pipe" })
    tmuxAvailable = true
  } catch {
    tmuxAvailable = false
  }
  return tmuxAvailable
}

// Get tmux session name for a terminal
export function getTmuxSessionName(terminalId: string): string {
  return `${TMUX_SESSION_PREFIX}-${terminalId}`
}

// Check if a tmux session exists
export function tmuxSessionExists(sessionName: string): boolean {
  try {
    execSync(`tmux has-session -t ${sessionName} 2>/dev/null`, { stdio: "pipe" })
    return true
  } catch {
    return false
  }
}

// List all claudiator tmux sessions
export function listTmuxSessions(): string[] {
  try {
    const output = execSync(`tmux list-sessions -F "#{session_name}" 2>/dev/null`, {
      encoding: "utf-8",
    })
    return output
      .split("\n")
      .filter((s) => s.startsWith(TMUX_SESSION_PREFIX))
  } catch {
    return []
  }
}

// Kill a specific tmux session
export function killTmuxSession(sessionName: string): boolean {
  try {
    execSync(`tmux kill-session -t ${sessionName} 2>/dev/null`, { stdio: "pipe" })
    return true
  } catch {
    return false
  }
}

// Kill all claudiator tmux sessions
export function killAllTmuxSessions(): number {
  const sessions = listTmuxSessions()
  let killed = 0
  for (const session of sessions) {
    if (killTmuxSession(session)) {
      killed++
    }
  }
  return killed
}

// Active terminal processes
const activeTerminals = new Map<string, pty.IPty>()

export function getActiveTerminal(sessionId: string): pty.IPty | undefined {
  return activeTerminals.get(sessionId)
}

export function getAllActiveTerminals(): Map<string, pty.IPty> {
  return activeTerminals
}

// Build enhanced PATH with common user bin directories
function buildEnhancedPath(): string {
  const homeDir = os.homedir()
  const userPaths = [
    `${homeDir}/.local/bin`,
    `${homeDir}/.cargo/bin`,
    `${homeDir}/.nvm/versions/node/*/bin`,
    `${homeDir}/.pyenv/shims`,
    `${homeDir}/tools`,
    `${homeDir}/flutter/bin`,
    `/usr/local/bin`,
  ].filter((p) => !p.includes("*"))

  const systemPath = process.env.PATH || "/usr/local/bin:/usr/bin:/bin"
  return [...userPaths, systemPath].join(":")
}

interface SpawnOptions {
  sessionId: string
  workingDirectory: string
  cols: number
  rows: number
  useTmux?: boolean
  bypassPermissions?: boolean
  autoStartClaude?: boolean  // Auto-start claude command (default: true)
}

interface SpawnResult {
  ptyProcess: pty.IPty
  tmuxSessionName: string | null
}

// Build the claude command with options
function buildClaudeCommand(bypassPermissions: boolean): string {
  let cmd = "claude"
  if (bypassPermissions) {
    cmd += " --dangerously-skip-permissions"
  }
  return cmd
}

// Spawn a new terminal process
export function spawnTerminal(options: SpawnOptions): SpawnResult {
  const {
    sessionId,
    workingDirectory,
    cols,
    rows,
    useTmux = true,
    bypassPermissions = false,
    autoStartClaude = true,  // Default to auto-start claude
  } = options

  const shell = process.env.SHELL || (os.platform() === "win32" ? "powershell.exe" : "bash")
  const homeDir = os.homedir()
  const claudeCommand = buildClaudeCommand(bypassPermissions)

  let spawnCmd: string
  let spawnArgs: string[]
  let tmuxSessionName: string | null = null

  if (useTmux && isTmuxAvailable()) {
    tmuxSessionName = getTmuxSessionName(sessionId)

    // Kill existing session if it exists (for fresh start)
    if (tmuxSessionExists(tmuxSessionName)) {
      killTmuxSession(tmuxSessionName)
    }

    spawnCmd = "tmux"

    if (autoStartClaude) {
      // Create tmux session running claude directly
      spawnArgs = ["new-session", "-A", "-s", tmuxSessionName, claudeCommand]
      console.log(`[Claudiator] Creating tmux session: ${tmuxSessionName} with ${claudeCommand}`)
    } else {
      spawnArgs = ["new-session", "-A", "-s", tmuxSessionName]
      console.log(`[Claudiator] Creating tmux session: ${tmuxSessionName} (shell only)`)
    }
  } else {
    spawnCmd = shell
    spawnArgs = ["-l"]
    console.log(`[Claudiator] Spawning shell (tmux ${isTmuxAvailable() ? "disabled" : "not available"})`)
  }

  // Build environment
  const env: Record<string, string> = {
    ...process.env,
    PATH: buildEnhancedPath(),
    TERM: "xterm-256color",
    COLORTERM: "truecolor",
    HOME: homeDir,
  }

  // Add bypass permissions env var if enabled
  if (bypassPermissions) {
    env.CLAUDE_CODE_BYPASS_PERMISSIONS = "1"
  }

  const ptyProcess = pty.spawn(spawnCmd, spawnArgs, {
    name: "xterm-256color",
    cols,
    rows,
    cwd: workingDirectory,
    env,
  })

  // Track the process
  activeTerminals.set(sessionId, ptyProcess)

  // Enable mouse mode in tmux for proper scrolling
  if (tmuxSessionName && isTmuxAvailable()) {
    setTimeout(() => {
      try {
        execSync(`tmux set-option -t ${tmuxSessionName} -g mouse on`, { stdio: "pipe" })
      } catch (e) {
        console.log("[Claudiator] Could not enable tmux mouse mode:", e)
      }
    }, 500)
  }

  // If not using tmux but autoStartClaude is enabled, send the command
  if (!tmuxSessionName && autoStartClaude) {
    setTimeout(() => {
      ptyProcess.write(`${claudeCommand}\r`)
    }, 300)
  }

  // Handle process exit
  ptyProcess.onExit(() => {
    activeTerminals.delete(sessionId)
    console.log(`[Claudiator] Terminal ${sessionId} exited`)
  })

  return { ptyProcess, tmuxSessionName }
}

// Reconnect to an existing tmux session
export function reconnectToTmux(
  sessionId: string,
  tmuxSessionName: string,
  cols: number,
  rows: number
): pty.IPty | null {
  if (!isTmuxAvailable() || !tmuxSessionExists(tmuxSessionName)) {
    console.log(`[Claudiator] Cannot reconnect: tmux session ${tmuxSessionName} not found`)
    return null
  }

  const homeDir = os.homedir()

  const ptyProcess = pty.spawn("tmux", ["attach-session", "-t", tmuxSessionName], {
    name: "xterm-256color",
    cols,
    rows,
    cwd: homeDir,
    env: {
      ...process.env,
      PATH: buildEnhancedPath(),
      TERM: "xterm-256color",
      COLORTERM: "truecolor",
      HOME: homeDir,
    },
  })

  // Track the process
  activeTerminals.set(sessionId, ptyProcess)

  // Handle process exit
  ptyProcess.onExit(() => {
    activeTerminals.delete(sessionId)
    console.log(`[Claudiator] Terminal ${sessionId} disconnected from tmux`)
  })

  console.log(`[Claudiator] Reconnected to tmux session: ${tmuxSessionName}`)
  return ptyProcess
}

// Stop a terminal
export function stopTerminal(sessionId: string, killTmux: boolean = false): boolean {
  const ptyProcess = activeTerminals.get(sessionId)

  if (ptyProcess) {
    // If using tmux and killTmux is true, kill the tmux session
    if (killTmux && isTmuxAvailable()) {
      const tmuxSession = getTmuxSessionName(sessionId)
      killTmuxSession(tmuxSession)
    }

    ptyProcess.kill()
    activeTerminals.delete(sessionId)
    return true
  }

  return false
}

// Resize a terminal
export function resizeTerminal(sessionId: string, cols: number, rows: number): boolean {
  const ptyProcess = activeTerminals.get(sessionId)
  if (ptyProcess) {
    ptyProcess.resize(cols, rows)
    return true
  }
  return false
}

// Write to a terminal
export function writeToTerminal(sessionId: string, data: string): boolean {
  const ptyProcess = activeTerminals.get(sessionId)
  if (ptyProcess) {
    ptyProcess.write(data)
    return true
  }
  return false
}

// Cleanup on shutdown
export function cleanup(): void {
  console.log("[Claudiator] Cleaning up terminals...")

  for (const [sessionId, ptyProcess] of activeTerminals) {
    if (isTmuxAvailable()) {
      // Detach from tmux instead of killing - sessions will persist
      ptyProcess.write("\x02d") // Ctrl+B d to detach
      setTimeout(() => ptyProcess.kill(), 100)
      console.log(`[Claudiator] Detached from tmux session for ${sessionId}`)
    } else {
      ptyProcess.kill()
      console.log(`[Claudiator] Killed terminal ${sessionId}`)
    }
  }

  activeTerminals.clear()
}

// Export for server initialization
export const terminalServer = {
  isTmuxAvailable,
  getTmuxSessionName,
  tmuxSessionExists,
  listTmuxSessions,
  killTmuxSession,
  killAllTmuxSessions,
  spawnTerminal,
  reconnectToTmux,
  stopTerminal,
  resizeTerminal,
  writeToTerminal,
  getActiveTerminal,
  getAllActiveTerminals,
  cleanup,
}
