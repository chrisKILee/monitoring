import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params
  const existing = await prisma.member.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: '없는 사용자입니다' }, { status: 404 })

  const body = await req.json()
  const updated = await prisma.member.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.purpose !== undefined && { purpose: body.purpose }),
      ...(body.startDate !== undefined && { startDate: body.startDate ? new Date(body.startDate) : null }),
      ...(body.endDate !== undefined && { endDate: body.endDate ? new Date(body.endDate) : null }),
      ...(body.serviceAccountId !== undefined && { serviceAccountId: body.serviceAccountId }),
    },
    include: { serviceAccount: { select: { id: true, accountName: true, service: true } } },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params
  const existing = await prisma.member.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: '없는 사용자입니다' }, { status: 404 })

  await prisma.member.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
