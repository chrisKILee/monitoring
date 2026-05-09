import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const members = await prisma.member.findMany({
    orderBy: { createdAt: 'asc' },
    include: { serviceAccount: { select: { id: true, accountName: true, service: true } } },
  })
  return NextResponse.json(members)
}

export async function POST(req: Request) {
  const body = await req.json()
  if (!body.name?.trim()) {
    return NextResponse.json({ error: '이름은 필수입니다' }, { status: 400 })
  }

  const member = await prisma.member.create({
    data: {
      name: body.name.trim(),
      purpose: body.purpose ?? null,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      serviceAccountId: body.serviceAccountId ?? null,
    },
    include: { serviceAccount: { select: { id: true, accountName: true, service: true } } },
  })
  return NextResponse.json(member, { status: 201 })
}
