"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { getMatchingPaths, addRecentPath } from "@/lib/settings"
import { RecentPath } from "@/types"
import { Folder, Clock, X } from "lucide-react"

interface PathAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (value: string) => void
  placeholder?: string
  className?: string
}

export function PathAutocomplete({
  value,
  onChange,
  onSubmit,
  placeholder = "Enter working directory path...",
  className,
}: PathAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<RecentPath[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Update suggestions when value changes
  useEffect(() => {
    const matches = getMatchingPaths(value)
    setSuggestions(matches.slice(0, 10)) // Show max 10 suggestions
    setSelectedIndex(-1)
  }, [value])

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        setIsOpen(true)
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
      } else if (e.key === "Enter") {
        e.preventDefault()
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          // Select from suggestions
          const selected = suggestions[selectedIndex].path
          onChange(selected)
          addRecentPath(selected)
          onSubmit(selected)
          setIsOpen(false)
        } else if (value.trim()) {
          // Submit current value
          addRecentPath(value.trim())
          onSubmit(value.trim())
          setIsOpen(false)
        }
      } else if (e.key === "Escape") {
        setIsOpen(false)
        setSelectedIndex(-1)
      } else if (e.key === "Tab" && suggestions.length > 0) {
        e.preventDefault()
        // Auto-complete with first suggestion if nothing selected
        const idx = selectedIndex >= 0 ? selectedIndex : 0
        if (suggestions[idx]) {
          onChange(suggestions[idx].path)
        }
      }
    },
    [selectedIndex, suggestions, value, onChange, onSubmit]
  )

  // Handle suggestion click
  const handleSuggestionClick = useCallback(
    (path: string) => {
      onChange(path)
      addRecentPath(path)
      onSubmit(path)
      setIsOpen(false)
    },
    [onChange, onSubmit]
  )

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll("[data-suggestion]")
      items[selectedIndex]?.scrollIntoView({ block: "nearest" })
    }
  }, [selectedIndex])

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Folder className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            // Delay close to allow click on suggestion
            setTimeout(() => setIsOpen(false), 200)
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-9"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange("")
              inputRef.current?.focus()
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={listRef}
          className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg max-h-64 overflow-auto"
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.path}
              data-suggestion
              onClick={() => handleSuggestionClick(suggestion.path)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors",
                index === selectedIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50"
              )}
            >
              <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate flex-1 text-sm">{suggestion.path}</span>
              <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                <Clock className="h-3 w-3" />
                <span>{suggestion.useCount}x</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {isOpen && suggestions.length === 0 && value && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg p-3 text-sm text-muted-foreground">
          Press Enter to use this path
        </div>
      )}
    </div>
  )
}
