import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const accounts = await prisma.serviceAccount.findMany({
    orderBy: { accountName: 'asc' },
    include: {
      account: { select: { id: true, name: true, alias: true, isActive: true, lastError: true } },
      members: {
        select: { id: true, name: true, purpose: true, startDate: true, endDate: true },
        orderBy: { name: 'asc' },
      },
    },
  })
  return NextResponse.json(accounts)
}

export async function POST(req: Request) {
  const body = await req.json()
  if (!body.accountName?.trim()) {
    return NextResponse.json({ error: 'accountName은 필수입니다' }, { status: 400 })
  }
  if (!body.service?.trim()) {
    return NextResponse.json({ error: 'service는 필수입니다' }, { status: 400 })
  }

  const existing = await prisma.serviceAccount.findUnique({
    where: { accountName: body.accountName.trim() },
  })
  if (existing) {
    return NextResponse.json({ error: '이미 존재하는 계정명입니다' }, { status: 409 })
  }

  const created = await prisma.serviceAccount.create({
    data: {
      accountName: body.accountName.trim(),
      alias: body.alias?.trim() ?? null,
      service: body.service.trim(),
      phoneAuth: body.phoneAuth ?? null,
      isShared: body.isShared ?? null,
      note: body.note ?? null,
      accountId: body.accountId ?? null,
    },
    include: {
      account: { select: { id: true, name: true, alias: true, isActive: true, lastError: true } },
      members: true,
    },
  })
  return NextResponse.json(created, { status: 201 })
}
