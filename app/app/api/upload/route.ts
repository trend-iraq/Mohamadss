import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import sharp from 'sharp'

const BUCKET = 'products'

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

      let uploadBuffer: Buffer
      let contentType: string

      try {
        uploadBuffer = await sharp(buffer)
          .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer()
        contentType = 'image/webp'
      } catch {
        uploadBuffer = buffer
        contentType = file.type || 'image/jpeg'
      }

      const ext = contentType === 'image/webp' ? 'webp' : 'jpg'
      const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(filename, uploadBuffer, { contentType, upsert: false })

      if (error) {
        console.error('Supabase upload error:', error)
        return Response.json({ error: 'فشل رفع الصورة: ' + error.message }, { status: 500 })
      }

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename)
      urls.push(data.publicUrl)
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
