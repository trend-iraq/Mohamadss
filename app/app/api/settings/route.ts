import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

export async function GET() {
  const settings = await prisma.settings.findMany()
  const map: Record<string, string> = {}
  for (const s of settings) {
    map[s.key] = s.value
  }
  return Response.json({ settings: map })
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const body = await request.json()

    for (const [key, value] of Object.entries(body)) {
      await prisma.settings.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      })
    }

    return Response.json({ success: true })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return Response.json({ error: 'غير مصرح' }, { status: 401 })
    }
    console.error(err)
    return Response.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
