import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Ctx) {
  const { id: memberId } = await params
  const body = await req.json()

  if (!body.serviceAccountId) {
    return NextResponse.json({ error: '계정을 선택해주세요' }, { status: 400 })
  }

  try {
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
  } catch (e: any) {
    if (e.code === 'P2002') {
      return NextResponse.json({ error: '이미 연결된 계정입니다' }, { status: 409 })
    }
    if (e.code === 'P2025') {
      return NextResponse.json({ error: '존재하지 않는 멤버 또는 계정입니다' }, { status: 404 })
    }
    console.error('[POST /api/members/[id]/accounts]', e)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
