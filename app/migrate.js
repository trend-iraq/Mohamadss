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
    sql: "SELECT id FROM User WHERE role = 'admin' LIMIT 1",
    args: [],
  })

  if (existing.rows.length > 0) {
    console.log('> Seed: admin user already exists')
    return
  }

  const id = `admin_${Date.now()}`
  const hashedPassword = await bcrypt.hash('a77889900@@', 12)

  await client.execute({
    sql: `INSERT INTO User (id, name, email, password, phone, role, isActive, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    args: [id, 'مدير المتجر', 'mnmh0073@gmail.com', hashedPassword, '07700000000', 'admin', 1],
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

  console.log('> Seed: admin user created')

  await seedProducts(client)
}

async function seedProducts(client) {
  const existing = await client.execute({
    sql: 'SELECT id FROM Product LIMIT 1',
    args: [],
  })

  if (existing.rows.length > 0) {
    console.log('> Seed: products already exist')
    return
  }

  const products = [
    { name: 'كفر آيفون 15 برو ماكس - سيليكون', description: 'كفر سيليكون عالي الجودة مناسب لآيفون 15 برو ماكس، يحمي الهاتف من الصدمات والخدوش', price: 15000, stock: 150, minOrder: 5 },
    { name: 'كفر سامسونج S24 Ultra - كربون', description: 'كفر بتصميم كربون أنيق يوفر حماية ممتازة لسامسونج S24 Ultra', price: 12000, stock: 200, minOrder: 5 },
    { name: 'سماعة بلوتوث TWS Pro', description: 'سماعات لاسلكية بتقنية بلوتوث 5.3، صوت نقي وبطارية تدوم 6 ساعات', price: 85000, stock: 45, minOrder: 3 },
    { name: 'شاحن سريع 65 واط USB-C', description: 'شاحن سريع GaN متوافق مع جميع الهواتف والحواسيب المحمولة', price: 35000, stock: 200, minOrder: 10 },
    { name: 'كابل شحن USB-C مضفر 1 متر', description: 'كابل شحن سريع 100W مضفر بألياف النايلون، متين ومرن', price: 8000, stock: 500, minOrder: 20 },
    { name: 'كابل آيفون Lightning مضفر', description: 'كابل شحن آيفون مضفر دائم، يدعم الشحن السريع', price: 7000, stock: 400, minOrder: 20 },
    { name: 'حامل هاتف للسيارة - مغناطيسي', description: 'حامل مغناطيسي قوي للسيارة، يثبت على فتحة التهوية ويدعم جميع الهواتف', price: 18000, stock: 80, minOrder: 5 },
    { name: 'لاصق حماية الشاشة - زجاج مقسى 9H', description: 'حماية شاشة زجاج مقسى 9H، شفاف 100% لا يؤثر على وضوح الشاشة', price: 5000, stock: 1000, minOrder: 20 },
    { name: 'بطارية خارجية 20000 mAh', description: 'بنك طاقة 20000 mAh بمنافذ USB-C وUSB-A، يشحن هاتفين في آن واحد', price: 65000, stock: 60, minOrder: 3 },
    { name: 'بطارية خارجية 10000 mAh رفيعة', description: 'بنك طاقة رفيع وخفيف الوزن 10000 mAh مناسب للحمل اليومي', price: 40000, stock: 80, minOrder: 5 },
    { name: 'سماعة سلكية مع مايكروفون', description: 'سماعة آذان سلكية 3.5mm بجودة صوت عالية ومايكروفون واضح للمكالمات', price: 12000, stock: 120, minOrder: 10 },
    { name: 'ساعة ذكية سبورت', description: 'ساعة ذكية رياضية تقيس ضربات القلب والخطوات، مقاومة للماء IP67', price: 120000, stock: 30, minOrder: 2 },
    { name: 'منظم كابلات مغناطيسي', description: 'حامل كابلات مغناطيسي للمكتب، ينظم كابلات الشحن ويمنع تشابكها', price: 6000, stock: 300, minOrder: 10 },
    { name: 'حامل هاتف مكتبي قابل للتعديل', description: 'حامل هاتف مكتبي معدني قابل للتعديل بزوايا متعددة، مناسب لجميع الهواتف', price: 20000, stock: 100, minOrder: 5 },
    { name: 'لاقط بلوتوث للسيارة FM', description: 'لاقط بلوتوث للسيارة يبث الصوت عبر راديو FM مع شاحن USB مدمج', price: 25000, stock: 70, minOrder: 5 },
  ]

  for (const p of products) {
    const id = `prod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    await client.execute({
      sql: `INSERT INTO Product (id, name, description, price, stock, minOrder, images, isActive, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, '[]', 1, datetime('now'), datetime('now'))`,
      args: [id, p.name, p.description, p.price, p.stock, p.minOrder],
    })
  }

  console.log(`> Seed: ${products.length} products created`)
}

module.exports = { runMigrations }
