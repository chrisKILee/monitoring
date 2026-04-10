import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const accounts = await prisma.account.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      orgId: true,
      lastFetchedAt: true,
      lastError: true,
      usageLogs: {
        orderBy: { fetchedAt: 'desc' },
        take: 1,
        select: {
          usedMessages: true,
          totalMessages: true,
          usagePercent: true,
          expiresAt: true,
          planName: true,
          predictExceed5h: true,
          predictExceed7d: true,
          fetchedAt: true,
        },
      },
    },
  })

  const data = accounts.map(acc => ({
    id: acc.id,
    name: acc.name,
    orgId: acc.orgId,
    lastFetchedAt: acc.lastFetchedAt,
    lastError: acc.lastError,
    latest: acc.usageLogs[0] ?? null,
  }))

  return NextResponse.json({ data })
}
