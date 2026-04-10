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

/** raw cookie string(a=b; c=d) 또는 JSON 모두 파싱해서 Record로 반환 */
function parseCookieInput(input: string): Record<string, string> | null {
  const trimmed = input.trim()
  // JSON 형식 시도
  if (trimmed.startsWith('{')) {
    try {
      return JSON.parse(trimmed) as Record<string, string>
    } catch {
      return null
    }
  }
  // raw cookie string: "key=value; key2=value2"
  const result: Record<string, string> = {}
  for (const part of trimmed.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    const key = part.slice(0, idx).trim()
    const val = part.slice(idx + 1).trim()
    if (key) result[key] = val
  }
  return Object.keys(result).length > 0 ? result : null
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as { name?: string; cookiesJson?: string }

    if (!body.name || !body.cookiesJson) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'name, cookiesJson은 필수입니다' } },
        { status: 400 }
      )
    }

    // JSON 또는 raw cookie string 파싱 + orgId 자동 추출
    const parsed = parseCookieInput(body.cookiesJson)
    if (!parsed) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: '쿠키 형식이 올바르지 않습니다. JSON 또는 raw cookie string을 붙여넣어 주세요.' } },
        { status: 400 }
      )
    }

    const orgId = parsed.lastActiveOrg || parsed._orgId
    if (!orgId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'lastActiveOrg를 찾을 수 없습니다. Network 탭에서 cookie 헤더 전체를 복사해주세요.' } },
        { status: 400 }
      )
    }

    const existing = await prisma.account.findUnique({ where: { orgId } })
    if (existing) {
      return NextResponse.json(
        { error: { code: 'CONFLICT', message: '이미 등록된 orgId입니다' } },
        { status: 409 }
      )
    }

    const account = await prisma.account.create({
      data: {
        name: body.name,
        orgId,
        encryptedCookies: encrypt(JSON.stringify(parsed)),
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
