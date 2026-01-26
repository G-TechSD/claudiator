import { NextResponse } from "next/server"
import { terminalServer } from "@/lib/terminal-server"
import { getAuthInfo } from "@/lib/auth"

// Health endpoint is public for monitoring
export const dynamic = "force-dynamic"

export async function GET() {
  const authInfo = getAuthInfo()
  return NextResponse.json({
    status: "ok",
    uptime: process.uptime(),
    tmuxAvailable: terminalServer.isTmuxAvailable(),
    activeSessions: terminalServer.getAllActiveTerminals().size,
    tmuxSessions: terminalServer.listTmuxSessions().length,
    authEnabled: true,
    authSessions: authInfo.sessionCount,
  })
}
