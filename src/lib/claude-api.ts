export class CookieExpiredError extends Error {
  constructor(orgId: string) {
    super(`[${orgId}] 세션 쿠키가 만료되었습니다. 쿠키를 갱신해주세요.`)
    this.name = 'CookieExpiredError'
  }
}

export class ClaudeFetchError extends Error {
  constructor(orgId: string, status: number) {
    super(`[${orgId}] API 조회 실패 (HTTP ${status})`)
    this.name = 'ClaudeFetchError'
  }
}

export interface UsageResponse {
  usedMessages: number | null
  totalMessages: number | null
  usagePercent: number | null
  expiresAt: Date | null
  planName: string | null
  resetAt: Date | null
  rawResponse: Record<string, unknown>
  cookieExpiresAt: Date | null  // Set-Cookie 헤더에서 파싱한 sessionKey 만료일
}

export async function fetchUsage(
  orgId: string,
  cookiesJson: string
): Promise<UsageResponse> {
  const cookies = JSON.parse(cookiesJson) as Record<string, string>
  const cookieHeader = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ')

  const url = `https://claude.ai/api/organizations/${orgId}/usage`

  const res = await fetch(url, {
    headers: {
      accept: '*/*',
      'accept-language': 'ko-KR,ko;q=0.9',
      'anthropic-client-platform': 'web_claude_ai',
      'content-type': 'application/json',
      cookie: cookieHeader,
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    },
  })

  if (res.status === 401 || res.status === 403) {
    throw new CookieExpiredError(orgId)
  }

  if (!res.ok) {
    throw new ClaudeFetchError(orgId, res.status)
  }

  const raw = (await res.json()) as Record<string, unknown>
  const cookieExpiresAt = parseSessionKeyExpiry(res.headers)

  return { ...parseUsageResponse(raw), cookieExpiresAt }
}

/** Set-Cookie 헤더에서 sessionKey의 Expires를 파싱 */
function parseSessionKeyExpiry(headers: Headers): Date | null {
  // Node.js fetch는 Set-Cookie를 getSetCookie() 또는 get('set-cookie')로 접근
  const setCookies: string[] = []
  if (typeof (headers as { getSetCookie?: () => string[] }).getSetCookie === 'function') {
    setCookies.push(...(headers as { getSetCookie: () => string[] }).getSetCookie())
  } else {
    const raw = headers.get('set-cookie')
    if (raw) setCookies.push(raw)
  }

  for (const cookie of setCookies) {
    if (!cookie.toLowerCase().includes('sessionkey')) continue
    const expiresMatch = cookie.match(/expires=([^;]+)/i)
    if (expiresMatch) {
      const d = new Date(expiresMatch[1].trim())
      if (!isNaN(d.getTime())) return d
    }
  }
  return null
}

function parseUsageResponse(raw: Record<string, unknown>): UsageResponse {
  // API 응답 스키마가 확인되지 않아 rawResponse 전체 보존
  // 실제 조회 후 필드명을 확인하여 파싱 로직 보완 필요
  const used = extractNumber(raw, [
    'used_messages', 'message_count', 'used', 'usage_count'
  ])
  const total = extractNumber(raw, [
    'total_messages', 'message_limit', 'total', 'limit'
  ])
  const expiresAt = extractDate(raw, [
    'expires_at', 'expiry', 'subscription_expires_at', 'renewal_date'
  ])
  const resetAt = extractDate(raw, [
    'reset_at', 'resets_at', 'next_reset'
  ])
  const planName = extractString(raw, [
    'plan', 'plan_name', 'subscription_plan', 'tier'
  ])

  const usagePercent =
    used !== null && total !== null && total > 0
      ? Math.round((used / total) * 100 * 10) / 10
      : null

  return {
    usedMessages: used,
    totalMessages: total,
    usagePercent,
    expiresAt,
    planName,
    resetAt,
    rawResponse: raw,
    cookieExpiresAt: null,  // fetchUsage에서 Set-Cookie 파싱 후 덮어씀
  }
}

function extractNumber(
  obj: Record<string, unknown>,
  keys: string[]
): number | null {
  for (const key of keys) {
    const val = obj[key]
    if (typeof val === 'number') return val
    if (typeof val === 'string' && !isNaN(Number(val))) return Number(val)
  }
  return null
}

function extractDate(
  obj: Record<string, unknown>,
  keys: string[]
): Date | null {
  for (const key of keys) {
    const val = obj[key]
    if (typeof val === 'string' || typeof val === 'number') {
      const d = new Date(val)
      if (!isNaN(d.getTime())) return d
    }
  }
  return null
}

function extractString(
  obj: Record<string, unknown>,
  keys: string[]
): string | null {
  for (const key of keys) {
    const val = obj[key]
    if (typeof val === 'string') return val
  }
  return null
}
