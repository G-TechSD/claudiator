"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { generateId } from "@/lib/utils"
import { TerminalTile } from "@/components/terminal/terminal-tile"
import { PathAutocomplete } from "@/components/terminal/path-autocomplete"
import { SettingsPanel } from "./settings-panel"
import {
  loadTerminals,
  saveTerminals,
  addTerminal as addTerminalToStore,
  removeTerminal as removeTerminalFromStore,
} from "@/lib/session-store"
import { loadSettings, addRecentPath } from "@/lib/settings"
import {
  TerminalSession,
  ClaudiatorSettings,
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
  FoldVertical,
  UnfoldVertical,
} from "lucide-react"

export function MultiTerminalDashboard() {
  const [terminals, setTerminals] = useState<TerminalSession[]>([])
  const [settings, setSettings] = useState<ClaudiatorSettings>(DEFAULT_SETTINGS)
  const [showSettings, setShowSettings] = useState(false)
  const [newPath, setNewPath] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  // Load initial state
  useEffect(() => {
    setTerminals(loadTerminals())
    setSettings(loadSettings())
  }, [])

  // Create new terminal
  const handleCreateTerminal = useCallback(
    async (path: string) => {
      if (!path.trim() || terminals.length >= MAX_TERMINALS || isCreating) return

      setIsCreating(true)
      try {
        // Create terminal via API
        const response = await fetch("/api/terminal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workingDirectory: path.trim(),
            bypassPermissions: settings.bypassPermissionsDefault,
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
          workingDirectory: path.trim(),
          createdAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
          status: "active",
          bypassPermissions: settings.bypassPermissionsDefault,
        }

        const updated = [...terminals, newTerminal]
        setTerminals(updated)
        saveTerminals(updated)
        addRecentPath(path.trim())
        setNewPath("")
      } catch (error) {
        console.error("Failed to create terminal:", error)
        alert("Failed to create terminal. Please try again.")
      } finally {
        setIsCreating(false)
      }
    },
    [terminals, settings.bypassPermissionsDefault, isCreating]
  )

  // Close terminal
  const handleCloseTerminal = useCallback(
    async (id: string) => {
      try {
        // Stop terminal via API
        await fetch(`/api/terminal?sessionId=${id}&killTmux=true`, {
          method: "DELETE",
        })

        // Remove from local state
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
  const handlePopOut = useCallback((id: string) => {
    const terminal = terminals.find((t) => t.id === id)
    if (!terminal) return

    // Open in new window with session info
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
  }, [terminals])

  // Close all terminals
  const handleCloseAll = useCallback(async () => {
    if (!window.confirm("Close all terminals?")) return

    try {
      // Kill all sessions via API
      await fetch("/api/sessions?all=true", { method: "DELETE" })

      setTerminals([])
      saveTerminals([])
    } catch (error) {
      console.error("Failed to close all terminals:", error)
    }
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
              onClick={() => setSettings({ ...settings, gridColumns: 1 })}
              title="1 column"
            >
              <Rows className="h-4 w-4" />
            </Button>
            <Button
              variant={settings.gridColumns === 2 ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => setSettings({ ...settings, gridColumns: 2 })}
              title="2 columns"
            >
              <Grid2X2 className="h-4 w-4" />
            </Button>
            <Button
              variant={settings.gridColumns === 3 ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => setSettings({ ...settings, gridColumns: 3 })}
              title="3 columns"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={settings.gridColumns === 4 ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => setSettings({ ...settings, gridColumns: 4 })}
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

      {/* New Terminal Input */}
      <div className="px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2 max-w-2xl">
          <PathAutocomplete
            value={newPath}
            onChange={setNewPath}
            onSubmit={handleCreateTerminal}
            placeholder="Enter working directory path..."
            className="flex-1"
          />
          <Button
            onClick={() => handleCreateTerminal(newPath)}
            disabled={
              !newPath.trim() ||
              terminals.length >= MAX_TERMINALS ||
              isCreating
            }
          >
            <Plus className="h-4 w-4 mr-1" />
            {isCreating ? "Creating..." : "New Terminal"}
          </Button>
        </div>
        {settings.bypassPermissionsDefault && (
          <p className="text-xs text-muted-foreground mt-2">
            Bypass permissions is enabled by default for new terminals
          </p>
        )}
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
              Enter a directory path above and press Enter to create your first
              terminal. Each terminal runs in its own tmux session for
              persistence.
            </p>
            <p className="text-sm text-muted-foreground">
              Tip: Your recent paths will be saved for quick access
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
        onSettingsChange={setSettings}
      />
    </div>
  )
}
