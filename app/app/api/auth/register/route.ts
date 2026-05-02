import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, signToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, phone } = await request.json()

    if (!name || !email || !password) {
      return Response.json({ error: 'جميع الحقول مطلوبة' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return Response.json({ error: 'البريد الإلكتروني مستخدم مسبقاً' }, { status: 400 })
    }

    const hashed = await hashPassword(password)
    const user = await prisma.user.create({
      data: { name, email, password: hashed, phone, role: 'customer' },
    })

    const token = signToken({ userId: user.id, email: user.email, role: user.role })
    const cookieStore = await cookies()
    cookieStore.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
      sameSite: 'lax',
    })

    return Response.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'حدث خطأ في الخادم' }, { status: 500 })
  }
}
