import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Ctx) {
  const { id: memberId } = await params
  const body = await req.json()

  if (!body.serviceAccountId) {
    return NextResponse.json({ error: '계정을 선택해주세요' }, { status: 400 })
  }

  const link = await prisma.memberServiceAccount.create({
    data: {
      memberId,
      serviceAccountId: body.serviceAccountId,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
    },
    include: { serviceAccount: { select: { id: true, accountName: true, service: true } } },
  })
  return NextResponse.json(link, { status: 201 })
}
