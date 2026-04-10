import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { encrypt, decrypt } from '@/lib/crypto'

export async function GET() {
  const accounts = await prisma.account.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      orgId: true,
      isActive: true,
      cookieExpiresAt: true,
      encryptedCookies: true,
      lastFetchedAt: true,
      lastError: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  const data = accounts.map(({ encryptedCookies, ...acc }) => {
    let deviceId: string | null = null
    try {
      const parsed = JSON.parse(decrypt(encryptedCookies)) as Record<string, string>
      deviceId = parsed['anthropic-device-id'] ?? null
    } catch { /* 복호화 실패 시 null */ }
    return { ...acc, deviceId }
  })

  return NextResponse.json({ data })
}

/** raw cookie string(a=b; c=d) 파싱 */
function parseCookieString(cookieStr: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const part of cookieStr.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    const key = part.slice(0, idx).trim()
    const val = part.slice(idx + 1).trim()
    if (key) result[key] = val
  }
  return result
}

/** curl 명령어, raw cookie string, JSON 모두 파싱해서 Record로 반환 */
function parseCookieInput(input: string): { cookies: Record<string, string>; orgId?: string } | null {
  const trimmed = input.trim()

  // curl 명령어: -b '...' 또는 --cookie '...' 에서 쿠키 추출
  if (trimmed.startsWith('curl')) {
    // 단따옴표 우선, 쿠키값 안에 큰따옴표가 있을 수 있으므로 [^'] 사용
    const cookieMatch =
      trimmed.match(/(?:-b|--cookie)\s+'([^']+)'/) ||
      trimmed.match(/(?:-b|--cookie)\s+"([^"]+)"/)
    if (!cookieMatch) return null
    const cookies = parseCookieString(cookieMatch[1])
    // URL에서 orgId 추출
    const orgMatch = trimmed.match(/organizations\/([a-f0-9-]{36})/)
    return { cookies, orgId: orgMatch?.[1] }
  }

  // JSON 형식
  if (trimmed.startsWith('{')) {
    try {
      return { cookies: JSON.parse(trimmed) as Record<string, string> }
    } catch {
      return null
    }
  }

  // raw cookie string
  const cookies = parseCookieString(trimmed)
  return Object.keys(cookies).length > 0 ? { cookies } : null
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

    // curl 명령어 / raw cookie string / JSON 파싱 + orgId 자동 추출
    const parseResult = parseCookieInput(body.cookiesJson)
    if (!parseResult) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: '쿠키 형식이 올바르지 않습니다. curl 명령어, cookie 헤더값, JSON 중 하나를 붙여넣어 주세요.' } },
        { status: 400 }
      )
    }

    const { cookies: parsed, orgId: curlOrgId } = parseResult
    const orgId = curlOrgId || parsed.lastActiveOrg || parsed._orgId
    if (!orgId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'orgId를 찾을 수 없습니다. curl 명령어 전체 또는 Network 탭 cookie 헤더를 붙여넣어 주세요.' } },
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

    const cookieExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30일 후

    const account = await prisma.account.create({
      data: {
        name: body.name,
        orgId,
        encryptedCookies: encrypt(JSON.stringify(parsed)),
        cookieExpiresAt,
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
