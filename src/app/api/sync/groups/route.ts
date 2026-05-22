import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function validateSecret(req: Request): boolean {
  const headerSecret = req.headers.get('x-sync-secret')
  const expected = process.env.SYNC_API_SECRET?.trim()
  if (!expected) return false
  return headerSecret?.trim() === expected
}

// Apps Script가 동기화 대상 그룹 목록을 받아오는 엔드포인트
// 응답: { groups: [{ id, groupEmail, alias }] }
export async function GET(req: Request) {
  if (!validateSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const accounts = await prisma.account.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, name: true, alias: true },
  })

  return NextResponse.json({
    groups: accounts.map(a => ({
      id: a.id,
      groupEmail: a.name,
      alias: a.alias,
    })),
  })
}
