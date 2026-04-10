import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get('accountId')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const logs = await prisma.usageLog.findMany({
    where: {
      ...(accountId && { accountId }),
      ...(from || to
        ? {
            fetchedAt: {
              ...(from && { gte: new Date(from) }),
              ...(to && { lte: new Date(to) }),
            },
          }
        : {}),
    },
    orderBy: { fetchedAt: 'desc' },
    take: 200,
    include: { account: { select: { name: true, orgId: true } } },
  })

  return NextResponse.json({ data: logs })
}
