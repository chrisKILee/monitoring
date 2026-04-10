import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const logs = await prisma.usageLog.findMany({
    where: {
      OR: [{ predictExceed5h: true }, { predictExceed7d: true }],
      fetchedAt: { gte: new Date(Date.now() - 6 * 3_600_000) }, // 최근 6시간
    },
    orderBy: { fetchedAt: 'desc' },
    distinct: ['accountId'],
    include: { account: { select: { name: true, orgId: true } } },
  })

  return NextResponse.json({ data: logs })
}
