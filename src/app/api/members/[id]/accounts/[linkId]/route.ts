import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type Ctx = { params: Promise<{ id: string; linkId: string }> }

export async function PATCH(req: Request, { params }: Ctx) {
  const { linkId } = await params
  const body = await req.json()

  const updated = await prisma.memberServiceAccount.update({
    where: { id: linkId },
    data: {
      ...(body.startDate !== undefined && {
        startDate: body.startDate ? new Date(body.startDate) : null,
      }),
      ...(body.endDate !== undefined && {
        endDate: body.endDate ? new Date(body.endDate) : null,
      }),
    },
    include: { serviceAccount: { select: { id: true, accountName: true, service: true } } },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { linkId } = await params
  await prisma.memberServiceAccount.delete({ where: { id: linkId } })
  return NextResponse.json({ ok: true })
}
