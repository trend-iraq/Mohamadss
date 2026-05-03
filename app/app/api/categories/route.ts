import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: { _count: { select: { products: true } } },
  })
  return Response.json({ categories })
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const { name, icon, sortOrder } = await request.json()
    if (!name) return Response.json({ error: 'اسم القسم مطلوب' }, { status: 400 })

    const category = await prisma.category.create({
      data: { name, icon: icon || null, sortOrder: sortOrder ?? 0 },
    })
    return Response.json({ category })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return Response.json({ error: 'غير مصرح' }, { status: 401 })
    }
    return Response.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
