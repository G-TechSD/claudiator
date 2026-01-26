#!/usr/bin/env node
/**
 * Display the Claudiator access token
 */

const fs = require('fs')
const path = require('path')

const TOKEN_FILE = path.join(__dirname, '..', '.local-storage', 'claudiator-token.json')

function generateToken() {
  return require('crypto').randomBytes(32).toString('hex')
}

function ensureToken() {
  const storageDir = path.dirname(TOKEN_FILE)

  // Create directory if needed
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true })
  }

  // Load or create token
  let token
  if (fs.existsSync(TOKEN_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8'))
      token = data.token
    } catch (e) {
      token = null
    }
  }

  if (!token) {
    token = generateToken()
    fs.writeFileSync(TOKEN_FILE, JSON.stringify({
      token,
      createdAt: new Date().toISOString()
    }, null, 2))
  }

  return token
}

function showToken() {
  const token = ensureToken()

  console.log('')
  console.log('╔══════════════════════════════════════════════════════════════════╗')
  console.log('║                     CLAUDIATOR ACCESS TOKEN                       ║')
  console.log('╠══════════════════════════════════════════════════════════════════╣')
  console.log('║                                                                   ║')
  console.log(`║  ${token}  ║`)
  console.log('║                                                                   ║')
  console.log('║  Use this token to log in at http://localhost:3200/login          ║')
  console.log('║                                                                   ║')
  console.log('║  Token file: .local-storage/claudiator-token.json                 ║')
  console.log('╚══════════════════════════════════════════════════════════════════╝')
  console.log('')
}

// If run directly
if (require.main === module) {
  showToken()
}

module.exports = { showToken, ensureToken }
