import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import sharp from 'sharp'

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return Response.json({ error: 'لم يتم تحديد ملفات' }, { status: 400 })
    }

    const urls: string[] = []

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(new Uint8Array(arrayBuffer))

      try {
        // Process with sharp → return as base64 data URL (no disk storage needed)
        const webpBuffer = await sharp(buffer)
          .resize(700, 700, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer()
        urls.push(`data:image/webp;base64,${webpBuffer.toString('base64')}`)
      } catch {
        // sharp failed → return original as base64
        const mime = file.type || 'image/jpeg'
        urls.push(`data:${mime};base64,${buffer.toString('base64')}`)
      }
    }

    return Response.json({ urls })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return Response.json({ error: 'غير مصرح' }, { status: 401 })
    }
    console.error('Upload error:', err)
    return Response.json({ error: 'فشل في رفع الملف' }, { status: 500 })
  }
}
