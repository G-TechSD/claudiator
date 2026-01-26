import { NextRequest, NextResponse } from "next/server"
import * as fs from "fs"
import * as path from "path"
import * as os from "os"
import { validateApiAuth } from "@/lib/api-auth"

// Force dynamic rendering
export const dynamic = "force-dynamic"

// Expand ~ to home directory
function expandPath(p: string): string {
  if (p.startsWith("~/")) {
    return path.join(os.homedir(), p.slice(2))
  }
  if (p === "~") {
    return os.homedir()
  }
  return p
}

// GET - List projects directory or check if path exists
export async function GET(request: NextRequest) {
  // Validate authentication
  const auth = validateApiAuth(request)
  if (!auth.authenticated) return auth.error!

  const { searchParams } = new URL(request.url)
  const checkPath = searchParams.get("checkPath")
  const projectsDir = searchParams.get("projectsDir")

  // Check if a specific path exists
  if (checkPath) {
    const expanded = expandPath(checkPath)
    try {
      const stats = fs.statSync(expanded)
      return NextResponse.json({
        exists: true,
        isDirectory: stats.isDirectory(),
        path: expanded,
      })
    } catch {
      return NextResponse.json({
        exists: false,
        path: expanded,
      })
    }
  }

  // List contents of projects directory
  if (projectsDir) {
    const expanded = expandPath(projectsDir)
    try {
      if (!fs.existsSync(expanded)) {
        return NextResponse.json({
          exists: false,
          projects: [],
          path: expanded,
        })
      }

      const entries = fs.readdirSync(expanded, { withFileTypes: true })
      const projects = entries
        .filter((e) => e.isDirectory())
        .map((e) => ({
          name: e.name,
          path: path.join(expanded, e.name),
        }))

      return NextResponse.json({
        exists: true,
        projects,
        path: expanded,
      })
    } catch (error) {
      return NextResponse.json(
        { error: "Failed to list projects directory" },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
}

// POST - Create a new project (just the folder)
export async function POST(request: NextRequest) {
  // Validate authentication
  const auth = validateApiAuth(request)
  if (!auth.authenticated) return auth.error!

  try {
    const body = await request.json()
    const { name, projectsDirectory, customPath } = body

    if (!name || (!projectsDirectory && !customPath)) {
      return NextResponse.json(
        { error: "name and either projectsDirectory or customPath required" },
        { status: 400 }
      )
    }

    // Sanitize project name for filesystem
    const sanitizedName = name
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")

    if (!sanitizedName) {
      return NextResponse.json(
        { error: "Invalid project name" },
        { status: 400 }
      )
    }

    // Determine the project path
    let projectPath: string
    if (customPath) {
      projectPath = expandPath(customPath)
    } else {
      const baseDir = expandPath(projectsDirectory)
      projectPath = path.join(baseDir, sanitizedName)
    }

    // Ensure parent directory exists
    const parentDir = path.dirname(projectPath)
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true })
    }

    // Create project directory if it doesn't exist
    if (!fs.existsSync(projectPath)) {
      fs.mkdirSync(projectPath, { recursive: true })
    }

    // Create a .claudiator marker file with project info
    const markerPath = path.join(projectPath, ".claudiator")
    const markerContent = JSON.stringify(
      {
        name: name,
        createdAt: new Date().toISOString(),
        version: "1.0",
      },
      null,
      2
    )

    if (!fs.existsSync(markerPath)) {
      fs.writeFileSync(markerPath, markerContent)
    }

    return NextResponse.json({
      success: true,
      project: {
        name: name,
        sanitizedName,
        path: projectPath,
        createdAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("[API] Error creating project:", error)
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    )
  }
}
