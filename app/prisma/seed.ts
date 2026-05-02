import 'dotenv/config'
import { PrismaClient } from '../app/generated/prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import bcrypt from 'bcryptjs'
import path from 'path'

const dbPath = path.join(process.cwd(), 'dev.db')
const adapter = new PrismaLibSql({ url: `file:${dbPath}` })
const prisma = new PrismaClient({ adapter })

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 12)
  await prisma.user.upsert({
    where: { email: 'admin@mohamadss.com' },
    update: {},
    create: { name: 'مدير المتجر', email: 'admin@mohamadss.com', password: adminPassword, role: 'admin', phone: '07700000000' },
  })

  const customerPassword = await bcrypt.hash('customer123', 12)
  await prisma.user.upsert({
    where: { email: 'customer@test.com' },
    update: {},
    create: { name: 'أحمد محمد', email: 'customer@test.com', password: customerPassword, role: 'customer', phone: '07801234567' },
  })

  const products = [
    { name: 'كفر آيفون 15 برو ماكس - سيليكون', description: 'كفر سيليكون عالي الجودة', price: 15000, stock: 150, minOrder: 5 },
    { name: 'سماعة بلوتوث TWS Pro', description: 'سماعات لاسلكية بتقنية بلوتوث 5.3', price: 85000, stock: 45, minOrder: 3 },
    { name: 'شاحن سريع 65 واط USB-C', description: 'شاحن سريع متوافق مع جميع الهواتف', price: 35000, stock: 200, minOrder: 10 },
    { name: 'كابل شحن USB-C مضفر 1 متر', description: 'كابل شحن سريع مضفر متين', price: 8000, stock: 500, minOrder: 20 },
    { name: 'حامل هاتف للسيارة - مغناطيسي', description: 'حامل هاتف مغناطيسي قوي', price: 18000, stock: 80, minOrder: 5 },
    { name: 'لاصق حماية الشاشة - زجاج مقسى', description: 'زجاج مقسى 9H لحماية الشاشة', price: 5000, stock: 8, minOrder: 20 },
    { name: 'بطارية خارجية 20000 mAh', description: 'بطارية احتياطية عالية السعة', price: 65000, stock: 0, minOrder: 3 },
    { name: 'سماعة سلكية مع مايكروفون', description: 'سماعة آذان سلكية بجودة عالية', price: 12000, stock: 120, minOrder: 10 },
  ]

  for (const product of products) {
    await prisma.product.create({ data: { ...product, images: '[]' } })
  }

  const settings = [
    { key: 'min_order_enabled', value: 'true' },
    { key: 'min_order_qty', value: '5' },
    { key: 'show_price_guests', value: 'false' },
    { key: 'whatsapp_number', value: '9647700000000' },
  ]

  for (const s of settings) {
    await prisma.settings.upsert({ where: { key: s.key }, update: {}, create: s })
  }

  console.log('✅ Database seeded successfully!')
  console.log('👤 Admin: admin@mohamadss.com / admin123')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
