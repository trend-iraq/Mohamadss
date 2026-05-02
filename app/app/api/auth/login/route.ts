import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { comparePassword, signToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return Response.json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبان' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })

    if (!user || !user.isActive) {
      return Response.json({ error: 'بيانات الدخول غير صحيحة' }, { status: 401 })
    }

    const isValid = await comparePassword(password, user.password)
    if (!isValid) {
      return Response.json({ error: 'بيانات الدخول غير صحيحة' }, { status: 401 })
    }

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
