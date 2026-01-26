"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Terminal, AlertCircle, Lock, Loader2 } from "lucide-react"

// Inner component that uses searchParams
function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [token, setToken] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Check for error in URL
  useEffect(() => {
    const urlError = searchParams.get("error")
    if (urlError === "invalid") {
      setError("Invalid token. Please try again.")
    } else if (urlError === "required") {
      setError("Authentication required.")
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    console.log("[Login] Attempting login...")

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      })

      console.log("[Login] Response status:", response.status)

      const data = await response.json()
      console.log("[Login] Response data:", data)

      if (response.ok && data.success) {
        console.log("[Login] Success, redirecting...")
        // Redirect to home or original destination
        const redirect = searchParams.get("redirect") || "/"
        // Use window.location for a full page reload to pick up the new cookie
        window.location.href = redirect
      } else {
        setError(data.error || "Authentication failed")
        setIsLoading(false)
      }
    } catch (err) {
      console.error("[Login] Error:", err)
      setError("Failed to connect to server: " + (err instanceof Error ? err.message : String(err)))
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-md">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-emerald-500/10 mb-4">
              <Terminal className="h-8 w-8 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-bold text-white">Claudiator</h1>
            <p className="text-zinc-400 text-sm mt-1">
              Multi-Terminal Manager for Claude Code
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Login form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="token" className="text-zinc-300">
                Access Token
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                  id="token"
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Enter your access token"
                  className="pl-10 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                  required
                  autoFocus
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
              disabled={isLoading}
            >
              {isLoading ? "Authenticating..." : "Login"}
            </Button>
          </form>

          {/* Help text */}
          <div className="mt-8 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
            <h3 className="text-sm font-medium text-zinc-300 mb-2">
              Where to find your token
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              The access token is displayed in the terminal when Claudiator starts.
              It&apos;s also saved in:
            </p>
            <code className="block mt-2 text-xs text-emerald-400 bg-zinc-900 px-2 py-1 rounded">
              .local-storage/claudiator-token.json
            </code>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-zinc-600 mt-6">
          Claudiator - Claude Code Multi-Terminal Manager
        </p>
      </div>
    </div>
  )
}

// Loading fallback
function LoginLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="flex items-center gap-3 text-zinc-400">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>Loading...</span>
      </div>
    </div>
  )
}

// Main page component with Suspense boundary
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginForm />
    </Suspense>
  )
}
