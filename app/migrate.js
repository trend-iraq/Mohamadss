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

  // Seed admin user if not exists
  await seedAdmin(client)
}

async function seedAdmin(client) {
  const bcrypt = require('bcryptjs')

  const existing = await client.execute({
    sql: "SELECT id FROM User WHERE email = 'admin@mohamadss.com' LIMIT 1",
    args: [],
  })

  if (existing.rows.length > 0) {
    console.log('> Seed: admin user already exists')
    return
  }

  const id = `admin_${Date.now()}`
  const hashedPassword = await bcrypt.hash('admin123', 12)

  await client.execute({
    sql: `INSERT INTO User (id, name, email, password, phone, role, isActive, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    args: [id, 'مدير المتجر', 'admin@mohamadss.com', hashedPassword, '07700000000', 'admin', 1],
  })

  // Seed default settings
  const settings = [
    ['whatsapp_number', '9647700000000'],
    ['store_name', 'المجمع الصيني للاكسسوارات'],
    ['store_address', 'بغداد ساحة الوثبة مقابل أمانة بغداد'],
    ['min_order_enabled', 'true'],
    ['min_order_qty', '5'],
    ['show_price_guests', 'false'],
  ]

  for (const [key, value] of settings) {
    try {
      await client.execute({
        sql: "INSERT OR IGNORE INTO Settings (id, key, value) VALUES (?, ?, ?)",
        args: [`setting_${key}`, key, value],
      })
    } catch {}
  }

  console.log('> Seed: admin user created (admin@mohamadss.com / admin123)')
}

module.exports = { runMigrations }
