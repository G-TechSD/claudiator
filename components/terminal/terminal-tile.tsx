"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { TerminalEmulator } from "./terminal-emulator"
import { TerminalSession, TERMINAL_COLORS } from "@/types"
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  X,
  Terminal,
  RotateCcw,
} from "lucide-react"

interface TerminalTileProps {
  session: TerminalSession
  onClose: (id: string) => void
  onPopOut: (id: string) => void
  isPoppedOut?: boolean
  onPopIn?: (id: string) => void
  className?: string
}

export function TerminalTile({
  session,
  onClose,
  onPopOut,
  isPoppedOut = false,
  onPopIn,
  className,
}: TerminalTileProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const terminalContainerRef = useRef<HTMLDivElement>(null)

  // Refit terminal when collapse state changes
  useEffect(() => {
    if (!isCollapsed && terminalContainerRef.current) {
      const el = terminalContainerRef.current.querySelector("[data-connected]")
      if (el && (el as unknown as { fit?: () => void }).fit) {
        setTimeout(() => {
          ;(el as unknown as { fit: () => void }).fit()
        }, 100)
      }
    }
  }, [isCollapsed])

  const handleClose = useCallback(() => {
    if (window.confirm("Close this terminal?")) {
      onClose(session.id)
    }
  }, [session.id, onClose])

  const handlePopOut = useCallback(() => {
    onPopOut(session.id)
  }, [session.id, onPopOut])

  const borderColor = session.color
    ? TERMINAL_COLORS[session.color]
    : undefined

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border bg-card overflow-hidden",
        className
      )}
      style={borderColor ? { borderColor, borderWidth: 2 } : undefined}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
        <div className="flex items-center gap-2 min-w-0">
          <Terminal className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-medium truncate">
            {session.label || session.workingDirectory.split("/").pop()}
          </span>
          <span
            className={cn(
              "h-2 w-2 rounded-full shrink-0",
              isReady ? "bg-green-500" : "bg-yellow-500"
            )}
            title={isReady ? "Connected" : "Connecting..."}
          />
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handlePopOut}
            title="Pop out to new window"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={handleClose}
            title="Close terminal"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Path info */}
      <div className="px-3 py-1 text-xs text-muted-foreground bg-muted/30 border-b truncate">
        {session.workingDirectory}
      </div>

      {/* Terminal - only show if not collapsed and not popped out */}
      {!isCollapsed && !isPoppedOut && (
        <div ref={terminalContainerRef} className="flex-1 min-h-[300px]">
          <TerminalEmulator
            sessionId={session.id}
            tmuxSessionName={session.tmuxSessionName}
            onReady={() => setIsReady(true)}
            onExit={() => setIsReady(false)}
            className="h-full"
          />
        </div>
      )}

      {/* Popped out placeholder */}
      {!isCollapsed && isPoppedOut && (
        <div className="flex-1 min-h-[300px] flex flex-col items-center justify-center gap-3 bg-purple-500/5 border-2 border-dashed border-purple-500/30 m-2 rounded-lg">
          <ExternalLink className="h-8 w-8 text-purple-400" />
          <p className="text-sm text-purple-400">Terminal in separate window</p>
          <p className="text-xs text-muted-foreground">tmux: {session.tmuxSessionName}</p>
          {onPopIn && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPopIn(session.id)}
              className="mt-2"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Pop back in
            </Button>
          )}
        </div>
      )}

      {/* Collapsed placeholder */}
      {isCollapsed && (
        <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
          {isPoppedOut ? "Terminal popped out" : "Terminal collapsed - click to expand"}
        </div>
      )}
    </div>
  )
}
