"use client"

import { ClaudiatorSettings, ClaudiatorProject, DEFAULT_SETTINGS, STORAGE_KEYS, RecentPath } from "@/types"

// Settings management
export function loadSettings(): ClaudiatorSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS)
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
    }
  } catch (e) {
    console.error('Failed to load settings:', e)
  }
  return DEFAULT_SETTINGS
}

export function saveSettings(settings: ClaudiatorSettings): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings))
  } catch (e) {
    console.error('Failed to save settings:', e)
  }
}

export function updateSetting<K extends keyof ClaudiatorSettings>(
  key: K,
  value: ClaudiatorSettings[K]
): ClaudiatorSettings {
  const settings = loadSettings()
  settings[key] = value
  saveSettings(settings)
  return settings
}

// Recent paths management
export function loadRecentPaths(): RecentPath[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.RECENT_PATHS)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('Failed to load recent paths:', e)
  }
  return []
}

export function saveRecentPaths(paths: RecentPath[]): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEYS.RECENT_PATHS, JSON.stringify(paths))
  } catch (e) {
    console.error('Failed to save recent paths:', e)
  }
}

export function addRecentPath(path: string): RecentPath[] {
  const settings = loadSettings()
  const maxPaths = settings.maxRecentPaths
  const paths = loadRecentPaths()

  // Check if path already exists
  const existingIndex = paths.findIndex(p => p.path === path)

  if (existingIndex >= 0) {
    // Update existing path
    paths[existingIndex].lastUsed = new Date().toISOString()
    paths[existingIndex].useCount++
    // Move to front
    const [existing] = paths.splice(existingIndex, 1)
    paths.unshift(existing)
  } else {
    // Add new path at front
    paths.unshift({
      path,
      lastUsed: new Date().toISOString(),
      useCount: 1,
    })
  }

  // Trim to max
  const trimmed = paths.slice(0, maxPaths)
  saveRecentPaths(trimmed)
  return trimmed
}

export function removeRecentPath(path: string): RecentPath[] {
  const paths = loadRecentPaths()
  const filtered = paths.filter(p => p.path !== path)
  saveRecentPaths(filtered)
  return filtered
}

export function clearRecentPaths(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEYS.RECENT_PATHS)
}

// Get matching paths for autocomplete
export function getMatchingPaths(query: string): RecentPath[] {
  if (!query) return loadRecentPaths()

  const lowerQuery = query.toLowerCase()
  const paths = loadRecentPaths()

  return paths.filter(p =>
    p.path.toLowerCase().includes(lowerQuery)
  ).sort((a, b) => {
    // Prioritize paths that start with the query
    const aStarts = a.path.toLowerCase().startsWith(lowerQuery)
    const bStarts = b.path.toLowerCase().startsWith(lowerQuery)
    if (aStarts && !bStarts) return -1
    if (!aStarts && bStarts) return 1
    // Then by use count
    return b.useCount - a.useCount
  })
}

// Projects management
export function loadProjects(): ClaudiatorProject[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.PROJECTS)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('Failed to load projects:', e)
  }
  return []
}

export function saveProjects(projects: ClaudiatorProject[]): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects))
  } catch (e) {
    console.error('Failed to save projects:', e)
  }
}
