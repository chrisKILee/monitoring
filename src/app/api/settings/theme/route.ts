import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { THEMES, type ThemeId } from '@/lib/theme'

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json() as { theme?: string }
  const { theme } = body

  if (!theme || !THEMES.find(t => t.id === theme)) {
    return NextResponse.json({ error: 'Invalid theme' }, { status: 400 })
  }

  await prisma.setting.upsert({
    where: { key: 'theme' },
    update: { value: theme },
    create: { key: 'theme', value: theme as ThemeId },
  })

  return NextResponse.json({ ok: true })
}
