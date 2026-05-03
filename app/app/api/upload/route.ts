import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'

async function saveImage(buffer: Buffer, uploadDir: string, originalExt: string): Promise<string> {
  const basename = uuidv4()

  try {
    const sharp = (await import('sharp')).default
    const webpPath = join(uploadDir, `${basename}.webp`)
    await sharp(buffer, { failOn: 'none' })
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(webpPath)
    return `/uploads/${basename}.webp`
  } catch (sharpErr) {
    console.warn('sharp failed, saving original:', sharpErr instanceof Error ? sharpErr.message : sharpErr)
    const ext = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(originalExt) ? originalExt : 'jpg'
    const origPath = join(uploadDir, `${basename}.${ext}`)
    await writeFile(origPath, buffer)
    return `/uploads/${basename}.${ext}`
  }
}

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
      // Copy into a new Buffer to avoid shared-memory corruption
      const buffer = Buffer.allocUnsafe(arrayBuffer.byteLength)
      Buffer.from(arrayBuffer).copy(buffer)

      const originalExt = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const url = await saveImage(buffer, uploadDir, originalExt)
      urls.push(url)
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
