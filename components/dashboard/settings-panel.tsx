"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { loadSettings, saveSettings, clearRecentPaths } from "@/lib/settings"
import { ClaudiatorSettings, DEFAULT_SETTINGS } from "@/types"
import { Settings, Trash2, RotateCcw } from "lucide-react"

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
  onSettingsChange: (settings: ClaudiatorSettings) => void
}

export function SettingsPanel({
  isOpen,
  onClose,
  onSettingsChange,
}: SettingsPanelProps) {
  const [settings, setSettings] = useState<ClaudiatorSettings>(DEFAULT_SETTINGS)

  useEffect(() => {
    setSettings(loadSettings())
  }, [isOpen])

  const handleSave = () => {
    saveSettings(settings)
    onSettingsChange(settings)
    onClose()
  }

  const handleReset = () => {
    if (window.confirm("Reset all settings to defaults?")) {
      setSettings(DEFAULT_SETTINGS)
      saveSettings(DEFAULT_SETTINGS)
      onSettingsChange(DEFAULT_SETTINGS)
    }
  }

  const handleClearPaths = () => {
    if (window.confirm("Clear all recent paths?")) {
      clearRecentPaths()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-background border rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Settings</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Bypass Permissions Default */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="bypass-permissions" className="text-sm font-medium">
                Bypass Permissions by Default
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                New terminals will have permissions bypass enabled
              </p>
            </div>
            <Switch
              id="bypass-permissions"
              checked={settings.bypassPermissionsDefault}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, bypassPermissionsDefault: checked })
              }
            />
          </div>

          {/* Grid Columns */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Default Grid Columns</Label>
            <div className="flex gap-2">
              {([1, 2, 3, 4] as const).map((cols) => (
                <Button
                  key={cols}
                  variant={settings.gridColumns === cols ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSettings({ ...settings, gridColumns: cols })}
                >
                  {cols}
                </Button>
              ))}
            </div>
          </div>

          {/* Server Hostname */}
          <div className="space-y-2">
            <Label htmlFor="hostname" className="text-sm font-medium">
              Server Hostname
            </Label>
            <Input
              id="hostname"
              value={settings.serverHostname}
              onChange={(e) =>
                setSettings({ ...settings, serverHostname: e.target.value })
              }
              placeholder="Leave empty for auto-detect"
            />
            <p className="text-xs text-muted-foreground">
              Set this to access from other machines (e.g., 192.168.1.100)
            </p>
          </div>

          {/* Max Recent Paths */}
          <div className="space-y-2">
            <Label htmlFor="max-paths" className="text-sm font-medium">
              Max Recent Paths
            </Label>
            <Input
              id="max-paths"
              type="number"
              min={5}
              max={100}
              value={settings.maxRecentPaths}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  maxRecentPaths: parseInt(e.target.value) || 25,
                })
              }
            />
          </div>

          {/* Clear Recent Paths */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div>
              <p className="text-sm font-medium">Recent Paths</p>
              <p className="text-xs text-muted-foreground">
                Clear autocomplete history
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearPaths}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset to Defaults
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Settings</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
