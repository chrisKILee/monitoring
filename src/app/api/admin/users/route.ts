import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export async function GET() {
  const session = await auth()
  if (session?.user.role !== 'admin') {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  }

  const users = await prisma.appUser.findMany({
    orderBy: { createdAt: 'asc' },
    include: { permissions: true },
  })
  return NextResponse.json(users)
}
