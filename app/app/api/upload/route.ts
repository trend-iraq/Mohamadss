import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'
import sharp from 'sharp'

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return Response.json({ error: 'لم يتم تحديد ملفات' }, { status: 400 })
    }

    const uploadDir = join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadDir, { recursive: true })

    const urls: string[] = []

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer()
      const uint8 = new Uint8Array(arrayBuffer)
      const buffer = Buffer.from(uint8)

      const basename = uuidv4()
      const webpPath = join(uploadDir, `${basename}.webp`)

      try {
        await sharp(buffer)
          .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 85 })
          .toFile(webpPath)
        urls.push(`/api/images/${basename}.webp`)
      } catch (sharpErr) {
        console.error('sharp error:', sharpErr instanceof Error ? sharpErr.message : sharpErr)
        // Fallback: save original file without processing
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
        const safeExt = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) ? ext : 'jpg'
        const origPath = join(uploadDir, `${basename}.${safeExt}`)
        await writeFile(origPath, buffer)
        urls.push(`/api/images/${basename}.${safeExt}`)
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
