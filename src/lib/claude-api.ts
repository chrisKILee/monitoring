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
  // 실제 API 응답 필드
  utilization5h: number | null       // five_hour.utilization (0-100)
  resetAt5h: Date | null             // five_hour.resets_at
  utilization7d: number | null       // seven_day.utilization (0-100)
  resetAt7d: Date | null             // seven_day.resets_at
  utilization7dSonnet: number | null // seven_day_sonnet.utilization (0-100)
  resetAt7dSonnet: Date | null       // seven_day_sonnet.resets_at
  // 하위 호환 (기존 필드 유지)
  usedMessages: number | null
  totalMessages: number | null
  usagePercent: number | null
  expiresAt: Date | null
  planName: string | null
  resetAt: Date | null
  rawResponse: Record<string, unknown>
  cookieExpiresAt: Date | null
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

  const parsed = parseUsageResponse(raw)
  return { ...parsed, cookieExpiresAt }
}

/** Set-Cookie 헤더에서 sessionKey의 Expires를 파싱 */
function parseSessionKeyExpiry(headers: Headers): Date | null {
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

interface WindowData {
  utilization?: number | null
  resets_at?: string | null
}

function parseWindow(raw: Record<string, unknown>, key: string): { utilization: number | null; resetAt: Date | null } {
  const win = raw[key] as WindowData | null | undefined
  if (!win) return { utilization: null, resetAt: null }
  const utilization = typeof win.utilization === 'number' ? win.utilization : null
  const resetAt = win.resets_at ? new Date(win.resets_at) : null
  return { utilization, resetAt: resetAt && !isNaN(resetAt.getTime()) ? resetAt : null }
}

function parseUsageResponse(raw: Record<string, unknown>): UsageResponse {
  const fiveHour = parseWindow(raw, 'five_hour')
  const sevenDay = parseWindow(raw, 'seven_day')
  const sevenDaySonnet = parseWindow(raw, 'seven_day_sonnet')

  return {
    utilization5h: fiveHour.utilization,
    resetAt5h: fiveHour.resetAt,
    utilization7d: sevenDay.utilization,
    resetAt7d: sevenDay.resetAt,
    utilization7dSonnet: sevenDaySonnet.utilization,
    resetAt7dSonnet: sevenDaySonnet.resetAt,
    // 하위 호환 필드 (null 유지)
    usedMessages: null,
    totalMessages: null,
    usagePercent: null,
    expiresAt: null,
    planName: null,
    resetAt: null,
    rawResponse: raw,
    cookieExpiresAt: null,
  }
}
