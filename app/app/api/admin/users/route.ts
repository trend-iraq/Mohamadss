import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, hashPassword } from '@/lib/auth'

export async function GET() {
  try {
    await requireAdmin()
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })
    return Response.json({ users })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return Response.json({ error: 'غير مصرح' }, { status: 401 })
    }
    return Response.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const { name, email, password, phone, role } = await request.json()

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return Response.json({ error: 'البريد مستخدم' }, { status: 400 })

    const hashed = await hashPassword(password)
    const user = await prisma.user.create({
      data: { name, email, password: hashed, phone, role: role || 'customer' },
      select: { id: true, name: true, email: true, phone: true, role: true },
    })

    return Response.json({ user }, { status: 201 })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return Response.json({ error: 'غير مصرح' }, { status: 401 })
    }
    console.error(err)
    return Response.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
