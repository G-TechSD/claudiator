"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { TerminalTile } from "@/components/terminal/terminal-tile"
import { SettingsPanel } from "./settings-panel"
import {
  loadTerminals,
  saveTerminals,
  removeTerminal as removeTerminalFromStore,
} from "@/lib/session-store"
import { loadSettings, saveSettings, addRecentPath, loadProjects, saveProjects } from "@/lib/settings"
import {
  TerminalSession,
  ClaudiatorSettings,
  ClaudiatorProject,
  MAX_TERMINALS,
  DEFAULT_SETTINGS,
} from "@/types"
import {
  Terminal,
  Plus,
  Grid2X2,
  Grid3X3,
  LayoutGrid,
  Rows,
  Settings,
  Trash2,
  FolderPlus,
  Folder,
  ChevronDown,
} from "lucide-react"

export function MultiTerminalDashboard() {
  const [terminals, setTerminals] = useState<TerminalSession[]>([])
  const [projects, setProjects] = useState<ClaudiatorProject[]>([])
  const [settings, setSettings] = useState<ClaudiatorSettings>(DEFAULT_SETTINGS)
  const [showSettings, setShowSettings] = useState(false)
  const [newProjectName, setNewProjectName] = useState("")
  const [customPath, setCustomPath] = useState("")
  const [showCustomPath, setShowCustomPath] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [existingProjects, setExistingProjects] = useState<{ name: string; path: string }[]>([])

  // Load initial state
  useEffect(() => {
    setTerminals(loadTerminals())
    setSettings(loadSettings())
    setProjects(loadProjects())
  }, [])

  // Load existing projects from filesystem
  useEffect(() => {
    async function loadExistingProjects() {
      try {
        const response = await fetch(
          `/api/projects?projectsDir=${encodeURIComponent(settings.projectsDirectory)}`
        )
        if (response.ok) {
          const data = await response.json()
          if (data.projects) {
            setExistingProjects(data.projects)
          }
        }
      } catch (error) {
        console.error("Failed to load existing projects:", error)
      }
    }
    loadExistingProjects()
  }, [settings.projectsDirectory])

  // Create new project and terminal
  const handleCreateProject = useCallback(
    async (projectName: string, pathOverride?: string) => {
      if ((!projectName.trim() && !pathOverride) || terminals.length >= MAX_TERMINALS || isCreating)
        return

      setIsCreating(true)
      try {
        let projectPath = pathOverride

        // If no path override, create project folder
        if (!projectPath) {
          const response = await fetch("/api/projects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: projectName.trim(),
              projectsDirectory: settings.projectsDirectory,
              customPath: showCustomPath && customPath.trim() ? customPath.trim() : undefined,
            }),
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || "Failed to create project")
          }

          const projectData = await response.json()
          projectPath = projectData.project.path

          // Save project to local storage
          const newProject: ClaudiatorProject = {
            id: Date.now().toString(),
            name: projectName.trim(),
            path: projectPath,
            createdAt: new Date().toISOString(),
            lastOpenedAt: new Date().toISOString(),
          }
          const updatedProjects = [...projects, newProject]
          setProjects(updatedProjects)
          saveProjects(updatedProjects)
        }

        // Create terminal via API
        const response = await fetch("/api/terminal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workingDirectory: projectPath,
            bypassPermissions: settings.bypassPermissionsDefault,
            autoStartClaude: settings.autoStartClaude,
            cols: 80,
            rows: 24,
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to create terminal")
        }

        const data = await response.json()

        // Add to local state
        const newTerminal: TerminalSession = {
          id: data.sessionId,
          tmuxSessionName: data.tmuxSessionName,
          workingDirectory: projectPath!,
          label: projectName.trim() || projectPath!.split("/").pop() || "Terminal",
          createdAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
          status: "active",
          bypassPermissions: settings.bypassPermissionsDefault,
        }

        const updated = [...terminals, newTerminal]
        setTerminals(updated)
        saveTerminals(updated)
        addRecentPath(projectPath!)
        setNewProjectName("")
        setCustomPath("")
        setShowCustomPath(false)
      } catch (error) {
        console.error("Failed to create project:", error)
        alert(error instanceof Error ? error.message : "Failed to create project")
      } finally {
        setIsCreating(false)
      }
    },
    [terminals, projects, settings, isCreating, showCustomPath, customPath]
  )

  // Open existing project
  const handleOpenProject = useCallback(
    (projectPath: string, projectName: string) => {
      handleCreateProject(projectName, projectPath)
    },
    [handleCreateProject]
  )

  // Close terminal
  const handleCloseTerminal = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/terminal?sessionId=${id}&killTmux=true`, {
          method: "DELETE",
        })

        const updated = terminals.filter((t) => t.id !== id)
        setTerminals(updated)
        removeTerminalFromStore(id)
      } catch (error) {
        console.error("Failed to close terminal:", error)
      }
    },
    [terminals]
  )

  // Pop out terminal
  const handlePopOut = useCallback(
    (id: string) => {
      const terminal = terminals.find((t) => t.id === id)
      if (!terminal) return

      const params = new URLSearchParams({
        sessionId: terminal.id,
        tmuxSessionName: terminal.tmuxSessionName,
        label: terminal.label || terminal.workingDirectory,
      })

      window.open(
        `/terminal/${terminal.id}?${params.toString()}`,
        `claudiator-${terminal.id}`,
        "width=1000,height=700,menubar=no,toolbar=no,location=no,status=no"
      )
    },
    [terminals]
  )

  // Close all terminals
  const handleCloseAll = useCallback(async () => {
    if (!window.confirm("Close all terminals?")) return

    try {
      await fetch("/api/sessions?all=true", { method: "DELETE" })
      setTerminals([])
      saveTerminals([])
    } catch (error) {
      console.error("Failed to close all terminals:", error)
    }
  }, [])

  // Update settings
  const handleSettingsChange = useCallback((newSettings: ClaudiatorSettings) => {
    setSettings(newSettings)
    saveSettings(newSettings)
  }, [])

  // Grid class based on columns
  const getGridClass = () => {
    switch (settings.gridColumns) {
      case 1:
        return "grid-cols-1"
      case 2:
        return "grid-cols-1 lg:grid-cols-2"
      case 3:
        return "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
      case 4:
        return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      default:
        return "grid-cols-1 lg:grid-cols-2"
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Terminal className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Claudiator</h1>
            <p className="text-sm text-muted-foreground">
              {terminals.length} of {MAX_TERMINALS} terminals
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2">
          {/* Grid columns selector */}
          <div className="flex items-center gap-1 border rounded-md p-1">
            <Button
              variant={settings.gridColumns === 1 ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => handleSettingsChange({ ...settings, gridColumns: 1 })}
              title="1 column"
            >
              <Rows className="h-4 w-4" />
            </Button>
            <Button
              variant={settings.gridColumns === 2 ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => handleSettingsChange({ ...settings, gridColumns: 2 })}
              title="2 columns"
            >
              <Grid2X2 className="h-4 w-4" />
            </Button>
            <Button
              variant={settings.gridColumns === 3 ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => handleSettingsChange({ ...settings, gridColumns: 3 })}
              title="3 columns"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={settings.gridColumns === 4 ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => handleSettingsChange({ ...settings, gridColumns: 4 })}
              title="4 columns"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>

          {/* Settings */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowSettings(true)}
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </Button>

          {/* Close all */}
          {terminals.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCloseAll}
              className="text-destructive hover:text-destructive"
              title="Close all terminals"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </header>

      {/* New Project Input */}
      <div className="px-4 py-4 border-b bg-muted/30">
        <div className="max-w-3xl space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2">
              <FolderPlus className="h-5 w-5 text-muted-foreground shrink-0" />
              <Input
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newProjectName.trim()) {
                    handleCreateProject(newProjectName)
                  }
                }}
                placeholder="Enter project name (e.g., my-awesome-app)"
                className="flex-1"
              />
            </div>
            <Button
              onClick={() => handleCreateProject(newProjectName)}
              disabled={
                !newProjectName.trim() ||
                terminals.length >= MAX_TERMINALS ||
                isCreating
              }
            >
              <Plus className="h-4 w-4 mr-1" />
              {isCreating ? "Creating..." : "New Project"}
            </Button>
          </div>

          {/* Custom path toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCustomPath(!showCustomPath)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <ChevronDown
                className={cn(
                  "h-3 w-3 transition-transform",
                  showCustomPath && "rotate-180"
                )}
              />
              {showCustomPath ? "Use default location" : "Choose custom location"}
            </button>
            {!showCustomPath && (
              <span className="text-xs text-muted-foreground">
                Projects saved to: {settings.projectsDirectory}
              </span>
            )}
          </div>

          {showCustomPath && (
            <Input
              value={customPath}
              onChange={(e) => setCustomPath(e.target.value)}
              placeholder="Custom path (e.g., ~/projects/my-app)"
              className="flex-1"
            />
          )}

          {/* Quick access to existing projects */}
          {existingProjects.length > 0 && (
            <div className="pt-2">
              <p className="text-xs text-muted-foreground mb-2">
                Open existing project:
              </p>
              <div className="flex flex-wrap gap-2">
                {existingProjects.slice(0, 8).map((project) => (
                  <Button
                    key={project.path}
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenProject(project.path, project.name)}
                    disabled={terminals.length >= MAX_TERMINALS || isCreating}
                    className="h-7 text-xs"
                  >
                    <Folder className="h-3 w-3 mr-1" />
                    {project.name}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {terminals.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-4">
              <Terminal className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No Terminals Open</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Enter a project name above and press Enter to create your first
              Claude Code terminal. A folder will be automatically created in{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                {settings.projectsDirectory}
              </code>
            </p>
            <p className="text-sm text-muted-foreground">
              Claude Code starts automatically in each terminal with tmux persistence
            </p>
          </div>
        ) : (
          /* Terminal grid */
          <div className={cn("grid gap-4", getGridClass())}>
            {terminals.map((terminal) => (
              <TerminalTile
                key={terminal.id}
                session={terminal}
                onClose={handleCloseTerminal}
                onPopOut={handlePopOut}
              />
            ))}
          </div>
        )}
      </div>

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSettingsChange={handleSettingsChange}
      />
    </div>
  )
}
