import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/crypto'

export async function GET() {
  const accounts = await prisma.account.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      orgId: true,
      isActive: true,
      lastFetchedAt: true,
      lastError: true,
      createdAt: true,
      updatedAt: true,
      // encryptedCookies 제외 (마스킹)
    },
  })
  return NextResponse.json({ data: accounts })
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as { name?: string; orgId?: string; cookiesJson?: string }

    if (!body.name || !body.orgId || !body.cookiesJson) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'name, orgId, cookiesJson은 필수입니다' } },
        { status: 400 }
      )
    }

    // cookiesJson 유효성 검사
    try {
      JSON.parse(body.cookiesJson)
    } catch {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'cookiesJson이 유효한 JSON이 아닙니다' } },
        { status: 400 }
      )
    }

    const existing = await prisma.account.findUnique({ where: { orgId: body.orgId } })
    if (existing) {
      return NextResponse.json(
        { error: { code: 'CONFLICT', message: '이미 등록된 orgId입니다' } },
        { status: 409 }
      )
    }

    const account = await prisma.account.create({
      data: {
        name: body.name,
        orgId: body.orgId,
        encryptedCookies: encrypt(body.cookiesJson),
      },
      select: { id: true, name: true, orgId: true, isActive: true, createdAt: true },
    })

    return NextResponse.json({ data: account }, { status: 201 })
  } catch (err) {
    console.error('POST /api/accounts error:', err)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: String(err) } },
      { status: 500 }
    )
  }
}
