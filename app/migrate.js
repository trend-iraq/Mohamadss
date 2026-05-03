// Applies SQL migration files directly to the database (local SQLite or Turso)
const fs = require('fs')
const path = require('path')

async function runMigrations() {
  const tursoUrl = process.env.TURSO_DATABASE_URL
  const tursoToken = process.env.TURSO_AUTH_TOKEN

  let client

  if (tursoUrl && !tursoUrl.startsWith('file:')) {
    // Turso cloud
    const { createClient } = require('@libsql/client')
    client = createClient({ url: tursoUrl, authToken: tursoToken })
    console.log('> Migrations: connecting to Turso...')
  } else {
    // Local SQLite
    const { createClient } = require('@libsql/client')
    const dbPath = path.join(process.cwd(), 'dev.db')
    client = createClient({ url: `file:${dbPath}` })
    console.log('> Migrations: connecting to local SQLite...')
  }

  // Create migrations tracking table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT NOT NULL PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  // Find all migration folders sorted by name
  const migrationsDir = path.join(process.cwd(), 'prisma', 'migrations')
  const folders = fs.readdirSync(migrationsDir)
    .filter(f => fs.statSync(path.join(migrationsDir, f)).isDirectory())
    .sort()

  for (const folder of folders) {
    const sqlFile = path.join(migrationsDir, folder, 'migration.sql')
    if (!fs.existsSync(sqlFile)) continue

    // Check if already applied
    const applied = await client.execute({
      sql: 'SELECT name FROM _migrations WHERE name = ?',
      args: [folder],
    })
    if (applied.rows.length > 0) {
      console.log(`> Migrations: skip ${folder} (already applied)`)
      continue
    }

    // Apply migration
    const sql = fs.readFileSync(sqlFile, 'utf8')
    const statements = sql
      .split('\n')
      .filter(line => !line.trimStart().startsWith('--'))
      .join('\n')
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    for (const stmt of statements) {
      try {
        await client.execute(stmt)
      } catch (e) {
        const msg = e.message || ''
        if (msg.includes('already exists') || msg.includes('duplicate column')) {
          // Table/column already exists — safe to skip
          continue
        }
        throw e
      }
    }

    // Record migration
    await client.execute({
      sql: 'INSERT INTO _migrations (name) VALUES (?)',
      args: [folder],
    })

    console.log(`> Migrations: applied ${folder}`)
  }

  console.log('> Migrations: done')
}

module.exports = { runMigrations }
