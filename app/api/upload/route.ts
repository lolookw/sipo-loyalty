import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'

const BUCKET = 'cafe-images'
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const ALLOWED_UPLOAD_TYPES = ['logo', 'cover'] as const
const EXTENSIONS_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

function sanitizePathSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-')
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const type = formData.get('type')
  const cafeSlug = formData.get('cafeSlug')

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (typeof type !== 'string' || !ALLOWED_UPLOAD_TYPES.includes(type as (typeof ALLOWED_UPLOAD_TYPES)[number]))
    return NextResponse.json({ error: 'Tipo de imagen no permitido' }, { status: 400 })
  if (typeof cafeSlug !== 'string' || !cafeSlug.trim())
    return NextResponse.json({ error: 'Café inválido' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type))
    return NextResponse.json({ error: 'Tipo de archivo no permitido' }, { status: 400 })
  if (file.size > MAX_SIZE)
    return NextResponse.json({ error: 'El archivo supera los 5 MB' }, { status: 400 })

  const cafe = await prisma.cafe.findUnique({ where: { slug: cafeSlug.trim() } })
  const isSuperAdmin = session.user.role === 'superadmin'
  if (!cafe || (!isSuperAdmin && cafe.ownerId !== session.user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const ext = EXTENSIONS_BY_MIME[file.type]
  const safeSlug = sanitizePathSegment(cafe.slug)
  const path = `${safeSlug}/${type}-${Date.now()}.${ext}`

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Supabase upload environment is not configured')
    return NextResponse.json({ error: 'Upload service is not configured' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (error) {
    console.error('Supabase upload error:', error)
    return NextResponse.json({ error: 'Error al subir imagen' }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)

  return NextResponse.json({ url: publicUrl })
}
