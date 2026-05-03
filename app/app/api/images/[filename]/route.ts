import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join, extname, basename } from 'path'

const MIME: Record<string, string> = {
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params
    // Prevent path traversal
    const safe = basename(filename)
    const filePath = join(process.cwd(), 'public', 'uploads', safe)
    const data = await readFile(filePath)
    const ext = extname(safe).toLowerCase()
    const contentType = MIME[ext] || 'application/octet-stream'
    return new NextResponse(data, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }
}
