// Terminal session types
export interface TerminalSession {
  id: string
  tmuxSessionName: string
  workingDirectory: string
  label?: string
  color?: TerminalColor
  createdAt: string
  lastActiveAt: string
  status: 'active' | 'disconnected' | 'terminated'
  bypassPermissions: boolean
}

export type TerminalColor =
  | 'blue'
  | 'green'
  | 'purple'
  | 'orange'
  | 'pink'
  | 'cyan'
  | 'yellow'
  | 'red'

export const TERMINAL_COLORS: Record<TerminalColor, string> = {
  blue: '#3b82f6',
  green: '#22c55e',
  purple: '#a855f7',
  orange: '#f97316',
  pink: '#ec4899',
  cyan: '#06b6d4',
  yellow: '#eab308',
  red: '#ef4444',
}

// Terminal group
export interface TerminalGroup {
  id: string
  name: string
  color: TerminalColor
  terminalIds: string[]
  isCollapsed: boolean
}

// Recent path for autocomplete
export interface RecentPath {
  path: string
  lastUsed: string
  useCount: number
}

// Settings
export interface ClaudiatorSettings {
  gridColumns: 1 | 2 | 3 | 4
  bypassPermissionsDefault: boolean
  theme: 'dark' | 'light' | 'system'
  serverHostname: string
  maxRecentPaths: number
}

export const DEFAULT_SETTINGS: ClaudiatorSettings = {
  gridColumns: 2,
  bypassPermissionsDefault: false,
  theme: 'dark',
  serverHostname: '',
  maxRecentPaths: 25,
}

// API request/response types
export interface CreateTerminalRequest {
  workingDirectory: string
  label?: string
  color?: TerminalColor
  bypassPermissions?: boolean
}

export interface CreateTerminalResponse {
  sessionId: string
  tmuxSessionName: string
}

export interface TerminalInputRequest {
  sessionId: string
  data: string
}

export interface TerminalResizeRequest {
  sessionId: string
  cols: number
  rows: number
}

// WebSocket message types
export type WSMessage =
  | { type: 'start'; sessionId: string; cols: number; rows: number }
  | { type: 'reconnect'; sessionId: string; tmuxSessionName: string; cols: number; rows: number }
  | { type: 'input'; data: string }
  | { type: 'resize'; cols: number; rows: number }

export type WSResponse =
  | { type: 'output'; data: string }
  | { type: 'session'; sessionId: string; tmuxSessionName: string }
  | { type: 'reconnected'; sessionId: string; tmuxSessionName: string }
  | { type: 'exit'; code: number }
  | { type: 'error'; message: string }

// Local storage keys
export const STORAGE_KEYS = {
  TERMINALS: 'claudiator-terminals',
  GROUPS: 'claudiator-groups',
  SETTINGS: 'claudiator-settings',
  RECENT_PATHS: 'claudiator-recent-paths',
  LAYOUT: 'claudiator-layout',
} as const

// Max terminals
export const MAX_TERMINALS = 8
