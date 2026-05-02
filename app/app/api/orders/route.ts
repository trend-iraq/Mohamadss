import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, requireAdmin } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const adminView = searchParams.get('admin') === 'true'
    const userId = searchParams.get('userId')

    if (adminView) {
      await requireAdmin()
      const orders = await prisma.order.findMany({
        include: { items: { include: { product: true } }, user: true },
        orderBy: { createdAt: 'desc' },
      })
      return Response.json({ orders })
    }

    const session = await getSession()
    if (!session) return Response.json({ error: 'غير مصرح' }, { status: 401 })

    const orders = await prisma.order.findMany({
      where: { userId: userId || session.userId },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return Response.json({ orders })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return Response.json({ error: 'غير مصرح' }, { status: 401 })
    }
    console.error(err)
    return Response.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    const body = await request.json()
    const { items, customerName, customerPhone, notes } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return Response.json({ error: 'لا توجد منتجات في الطلب' }, { status: 400 })
    }

    let total = 0
    const orderItems: { productId: string; quantity: number; price: number }[] = []

    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } })
      if (!product) continue
      if (product.stock < item.quantity) {
        return Response.json({ error: `المخزون غير كافٍ للمنتج: ${product.name}` }, { status: 400 })
      }
      const itemTotal = product.price * item.quantity
      total += itemTotal
      orderItems.push({ productId: item.productId, quantity: item.quantity, price: product.price })
    }

    const order = await prisma.order.create({
      data: {
        userId: session?.userId || null,
        customerName: customerName || (session ? undefined : 'زبون'),
        customerPhone: customerPhone || null,
        total,
        notes: notes || null,
        status: 'new',
        items: { create: orderItems },
      },
      include: { items: { include: { product: true } }, user: true },
    })

    for (const item of orderItems) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      })
    }

    return Response.json({ order }, { status: 201 })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'حدث خطأ في إنشاء الطلب' }, { status: 500 })
  }
}
