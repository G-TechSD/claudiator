"use client"

import { TerminalSession, TerminalGroup, STORAGE_KEYS } from "@/types"

// Terminal sessions management
export function loadTerminals(): TerminalSession[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.TERMINALS)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('Failed to load terminals:', e)
  }
  return []
}

export function saveTerminals(terminals: TerminalSession[]): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEYS.TERMINALS, JSON.stringify(terminals))
  } catch (e) {
    console.error('Failed to save terminals:', e)
  }
}

export function addTerminal(terminal: TerminalSession): TerminalSession[] {
  const terminals = loadTerminals()
  terminals.push(terminal)
  saveTerminals(terminals)
  return terminals
}

export function updateTerminal(id: string, updates: Partial<TerminalSession>): TerminalSession[] {
  const terminals = loadTerminals()
  const index = terminals.findIndex(t => t.id === id)
  if (index >= 0) {
    terminals[index] = { ...terminals[index], ...updates }
    saveTerminals(terminals)
  }
  return terminals
}

export function removeTerminal(id: string): TerminalSession[] {
  const terminals = loadTerminals()
  const filtered = terminals.filter(t => t.id !== id)
  saveTerminals(filtered)
  return filtered
}

export function clearTerminals(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEYS.TERMINALS)
}

// Terminal groups management
export function loadGroups(): TerminalGroup[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.GROUPS)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('Failed to load groups:', e)
  }
  return []
}

export function saveGroups(groups: TerminalGroup[]): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(groups))
  } catch (e) {
    console.error('Failed to save groups:', e)
  }
}

export function addGroup(group: TerminalGroup): TerminalGroup[] {
  const groups = loadGroups()
  groups.push(group)
  saveGroups(groups)
  return groups
}

export function updateGroup(id: string, updates: Partial<TerminalGroup>): TerminalGroup[] {
  const groups = loadGroups()
  const index = groups.findIndex(g => g.id === id)
  if (index >= 0) {
    groups[index] = { ...groups[index], ...updates }
    saveGroups(groups)
  }
  return groups
}

export function removeGroup(id: string): TerminalGroup[] {
  const groups = loadGroups()
  const filtered = groups.filter(g => g.id !== id)
  saveGroups(filtered)
  return filtered
}

export function addTerminalToGroup(groupId: string, terminalId: string): TerminalGroup[] {
  const groups = loadGroups()
  const group = groups.find(g => g.id === groupId)
  if (group && !group.terminalIds.includes(terminalId)) {
    group.terminalIds.push(terminalId)
    saveGroups(groups)
  }
  return groups
}

export function removeTerminalFromGroup(groupId: string, terminalId: string): TerminalGroup[] {
  const groups = loadGroups()
  const group = groups.find(g => g.id === groupId)
  if (group) {
    group.terminalIds = group.terminalIds.filter(id => id !== terminalId)
    saveGroups(groups)
  }
  return groups
}

export function clearGroups(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEYS.GROUPS)
}
