import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params
  const existing = await prisma.serviceAccount.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: '없는 계정입니다' }, { status: 404 })

  const body = await req.json()
  const updated = await prisma.serviceAccount.update({
    where: { id },
    data: {
      ...(body.accountName !== undefined && { accountName: body.accountName }),
      ...(body.alias !== undefined && { alias: body.alias }),
      ...(body.service !== undefined && { service: body.service }),
      ...(body.phoneAuth !== undefined && { phoneAuth: body.phoneAuth }),
      ...(body.isShared !== undefined && { isShared: body.isShared }),
      ...(body.note !== undefined && { note: body.note }),
      ...(body.accountId !== undefined && { accountId: body.accountId }),
    },
    include: {
      account: { select: { id: true, name: true, alias: true, isActive: true, lastError: true } },
      members: { select: { id: true, name: true } },
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params
  const existing = await prisma.serviceAccount.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: '없는 계정입니다' }, { status: 404 })

  await prisma.serviceAccount.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
