import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AiTool } from '@prisma/client'
import { encrypt, decrypt } from '@/lib/crypto'
import { fetchUsage } from '@/lib/claude-api'
import { extractBearerToken, parseTokenExpiry } from '@/lib/codex-api'

/** raw cookie string 또는 curl 명령어를 JSON 문자열로 정규화 */
function normalizeCookies(input: string): string | null {
  const trimmed = input.trim()
  if (trimmed.startsWith('{')) return trimmed  // 이미 JSON
  if (trimmed.startsWith('curl')) {
    const m = trimmed.match(/(?:-b|--cookie)\s+'([^']+)'/) ||
              trimmed.match(/(?:-b|--cookie)\s+"([^"]+)"/)
    if (!m) return null
    return JSON.stringify(parseCookieStr(m[1]))
  }
  // raw cookie string
  const parsed = parseCookieStr(trimmed)
  return Object.keys(parsed).length > 0 ? JSON.stringify(parsed) : null
}

function parseCookieStr(s: string): Record<string, string> {
  const r: Record<string, string> = {}
  for (const part of s.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    const k = part.slice(0, idx).trim()
    const v = part.slice(idx + 1).trim()
    if (k) r[k] = v
  }
  return r
}

type Params = { params: Promise<{ id: string }> }

export async function PUT(req: Request, { params }: Params) {
  const { id } = await params
  const body = await req.json() as {
    name?: string
    alias?: string | null
    cookiesJson?: string
    tokenInput?: string
    isActive?: boolean
    sortOrder?: number
    aiTool?: AiTool
    hiddenFromDashboard?: boolean
  }

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
      ...('alias' in body && { alias: body.alias ?? null }),
      ...(body.cookiesJson && (() => {
        const normalized = normalizeCookies(body.cookiesJson!)
        if (!normalized) throw new Error('쿠키 형식이 올바르지 않습니다')
        return {
          encryptedCookies: encrypt(normalized),
          cookieExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          lastError: null,
        }
      })()),
      ...(body.tokenInput && (() => {
        const token = extractBearerToken(body.tokenInput!)
        if (!token) throw new Error('토큰 형식이 올바르지 않습니다')
        return {
          encryptedToken: encrypt(token),
          tokenExpiresAt: parseTokenExpiry(token),
          lastError: null,
        }
      })()),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      ...(body.aiTool !== undefined && { aiTool: body.aiTool }),
      ...(body.hiddenFromDashboard !== undefined && { hiddenFromDashboard: body.hiddenFromDashboard }),
    },
    select: {
      id: true, name: true, alias: true, orgId: true, isActive: true,
      sortOrder: true, aiTool: true, hiddenFromDashboard: true, updatedAt: true,
    },
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

  if (account.aiTool !== 'claude' || !account.orgId || !account.encryptedCookies) {
    return NextResponse.json(
      { error: { code: 'UNSUPPORTED', message: `${account.aiTool} 계정은 사용량 수집을 지원하지 않습니다` } },
      { status: 400 }
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
