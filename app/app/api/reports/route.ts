import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'monthly'

    const now = new Date()
    let startDate: Date

    if (period === 'daily') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    } else if (period === 'weekly') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: startDate }, status: { not: 'cancelled' } },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'asc' },
    })

    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0)
    const totalOrders = orders.length

    const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {}
    for (const order of orders) {
      for (const item of order.items) {
        const id = item.productId
        if (!productSales[id]) {
          productSales[id] = { name: item.product.name, quantity: 0, revenue: 0 }
        }
        productSales[id].quantity += item.quantity
        productSales[id].revenue += item.price * item.quantity
      }
    }

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)

    const salesByDay: Record<string, number> = {}
    for (const order of orders) {
      const day = order.createdAt.toISOString().split('T')[0]
      salesByDay[day] = (salesByDay[day] || 0) + order.total
    }
    const salesChart = Object.entries(salesByDay).map(([date, amount]) => ({ date, amount }))

    const allOrdersCount = await prisma.order.count()
    const allRevenue = await prisma.order.aggregate({
      where: { status: { not: 'cancelled' } },
      _sum: { total: true },
    })

    return Response.json({
      period,
      totalRevenue,
      totalOrders,
      topProducts,
      salesChart,
      allTime: {
        orders: allOrdersCount,
        revenue: allRevenue._sum.total || 0,
      },
    })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return Response.json({ error: 'غير مصرح' }, { status: 401 })
    }
    console.error(err)
    return Response.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
