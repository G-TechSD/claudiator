import { NextResponse } from "next/server"
import { terminalServer } from "@/lib/terminal-server"

export async function GET() {
  return NextResponse.json({
    status: "ok",
    uptime: process.uptime(),
    tmuxAvailable: terminalServer.isTmuxAvailable(),
    activeSessions: terminalServer.getAllActiveTerminals().size,
    tmuxSessions: terminalServer.listTmuxSessions().length,
  })
}
