import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await auth()
  if (session?.user.role !== 'admin') {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()

  if (body.role !== undefined) {
    await prisma.appUser.update({ where: { id }, data: { role: body.role } })
  }

  if (body.permissions !== undefined) {
    await prisma.userPermission.upsert({
      where: { userId: id },
      create: { userId: id, ...body.permissions },
      update: body.permissions,
    })
  }

  const updated = await prisma.appUser.findUnique({
    where: { id },
    include: { permissions: true },
  })
  return NextResponse.json(updated)
}
