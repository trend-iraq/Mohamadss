import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  const adminView = searchParams.get('admin') === 'true'

  const where = adminView
    ? search ? { name: { contains: search } } : {}
    : { isActive: true, ...(search ? { name: { contains: search } } : {}) }

  const products = await prisma.product.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })

  // Strip heavy base64 image data from list — return only first image
  const lightProducts = products.map(p => {
    try {
      const imgs: string[] = JSON.parse(p.images || '[]')
      return { ...p, images: JSON.stringify(imgs.slice(0, 1)) }
    } catch {
      return { ...p, images: '[]' }
    }
  })

  return Response.json({ products: lightProducts }, {
    headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=60' },
  })
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const { name, description, price, stock, minOrder, images, video, categoryId } = await request.json()

    if (!name || price === undefined) {
      return Response.json({ error: 'الاسم والسعر مطلوبان' }, { status: 400 })
    }

    const product = await prisma.product.create({
      data: {
        name,
        description: description || '',
        price: Number(price),
        stock: Number(stock) || 0,
        minOrder: Number(minOrder) || 1,
        images: JSON.stringify(images || []),
        video: video || null,
        categoryId: categoryId || null,
      },
    })

    return Response.json({ product }, { status: 201 })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return Response.json({ error: 'غير مصرح' }, { status: 401 })
    }
    console.error(err)
    return Response.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
