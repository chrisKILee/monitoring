import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/crypto'
import { fetchUsage } from '@/lib/claude-api'
import { decrypt } from '@/lib/crypto'

type Params = { params: Promise<{ id: string }> }

export async function PUT(req: Request, { params }: Params) {
  const { id } = await params
  const body = await req.json() as { name?: string; cookiesJson?: string; isActive?: boolean }

  const account = await prisma.account.findUnique({ where: { id } })
  if (!account) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '계정을 찾을 수 없습니다' } },
      { status: 404 }
    )
  }

  const updated = await prisma.account.update({
    where: { id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.cookiesJson && { encryptedCookies: encrypt(body.cookiesJson) }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    },
    select: { id: true, name: true, orgId: true, isActive: true, updatedAt: true },
  })

  return NextResponse.json({ data: updated })
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params

  const account = await prisma.account.findUnique({ where: { id } })
  if (!account) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '계정을 찾을 수 없습니다' } },
      { status: 404 }
    )
  }

  await prisma.account.delete({ where: { id } })
  return NextResponse.json({ data: { id } })
}

// 단일 계정 즉시 수집 테스트
export async function POST(_req: Request, { params }: Params) {
  const { id } = await params

  const account = await prisma.account.findUnique({ where: { id } })
  if (!account) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '계정을 찾을 수 없습니다' } },
      { status: 404 }
    )
  }

  try {
    const cookiesJson = decrypt(account.encryptedCookies)
    const usage = await fetchUsage(account.orgId, cookiesJson)
    return NextResponse.json({ data: { success: true, usage } })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: { code: 'FETCH_ERROR', message } },
      { status: 502 }
    )
  }
}
