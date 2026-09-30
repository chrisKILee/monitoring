import type { UsageResponse } from './claude-api'

export class TokenExpiredError extends Error {
  constructor(name: string) {
    super(`[${name}] Codex Bearer 토큰이 만료되었습니다. 토큰을 갱신해주세요.`)
    this.name = 'TokenExpiredError'
  }
}

export class CodexFetchError extends Error {
  constructor(name: string, status: number) {
    super(`[${name}] Codex API 조회 실패 (HTTP ${status})`)
    this.name = 'CodexFetchError'
  }
}

interface CodexWindow {
  used_percent?: number | null
  reset_at?: number | null
  reset_after_seconds?: number | null
  limit_window_seconds?: number | null
}

interface CodexRateLimit {
  primary_window?: CodexWindow
  secondary_window?: CodexWindow
}

interface CodexAdditionalLimit {
  limit_name?: string
  rate_limit?: CodexRateLimit
}

interface CodexUsageRaw {
  rate_limit?: CodexRateLimit
  additional_rate_limits?: CodexAdditionalLimit[]
}

function parseWindow(win: CodexWindow | null | undefined): { utilization: number | null; resetAt: Date | null } {
  if (!win) return { utilization: null, resetAt: null }
  const utilization = typeof win.used_percent === 'number' ? win.used_percent : null
  const resetAt = typeof win.reset_at === 'number' ? new Date(win.reset_at * 1000) : null
  return { utilization, resetAt }
}

type ParsedWindow = ReturnType<typeof parseWindow>

const EMPTY_WINDOW: ParsedWindow = { utilization: null, resetAt: null }
/** 이 길이(초) 이하면 5시간 윈도우, 초과면 7일 윈도우로 본다 */
const SHORT_WINDOW_MAX_SECONDS = 24 * 60 * 60

/**
 * 윈도우 종류는 위치(primary/secondary)가 아니라 limit_window_seconds로 판별한다.
 * 5시간 제한이 폐지되면서 primary_window가 7일이 되고 secondary_window는 null이 됐다.
 * limit_window_seconds가 없는 구형 응답은 primary=5h, secondary=7d로 폴백한다.
 */
export function classifyWindows(limit: CodexRateLimit | null | undefined): {
  window5h: ParsedWindow
  window7d: ParsedWindow
} {
  const ordered: Array<[CodexWindow | null | undefined, 'short' | 'long']> = [
    [limit?.primary_window, 'short'],
    [limit?.secondary_window, 'long'],
  ]
  let window5h = EMPTY_WINDOW
  let window7d = EMPTY_WINDOW

  for (const [win, fallback] of ordered) {
    if (!win) continue
    const seconds = win.limit_window_seconds
    const kind =
      typeof seconds === 'number'
        ? seconds <= SHORT_WINDOW_MAX_SECONDS ? 'short' : 'long'
        : fallback
    if (kind === 'short') window5h = parseWindow(win)
    else window7d = parseWindow(win)
  }
  return { window5h, window7d }
}

/** JWT payload의 exp claim 파싱 */
export function parseTokenExpiry(token: string): Date | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { exp?: number }
    return typeof decoded.exp === 'number' ? new Date(decoded.exp * 1000) : null
  } catch {
    return null
  }
}

/** curl 명령어 또는 Bearer 토큰 문자열에서 토큰 추출 */
export function extractBearerToken(input: string): string | null {
  const trimmed = input.trim()
  // curl 명령어: -H 'authorization: Bearer ...' 또는 -H 'Authorization: Bearer ...'
  const curlMatch = trimmed.match(/authorization:\s*Bearer\s+([A-Za-z0-9\-_=.]+)/i)
  if (curlMatch) return curlMatch[1]
  // Bearer <token> 형식
  const bearerMatch = trimmed.match(/^Bearer\s+([A-Za-z0-9\-_=.]+)$/i)
  if (bearerMatch) return bearerMatch[1]
  // JWT 그대로 (eyJ로 시작하는 경우)
  if (/^eyJ[A-Za-z0-9\-_=.]+$/.test(trimmed)) return trimmed
  return null
}

export async function fetchCodexUsage(token: string, accountName: string): Promise<UsageResponse> {
  const res = await fetch('https://chatgpt.com/backend-api/wham/usage', {
    headers: {
      accept: '*/*',
      'accept-language': 'ko-KR,ko;q=0.9',
      authorization: `Bearer ${token}`,
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
      referer: 'https://chatgpt.com/codex/cloud/settings/analytics',
    },
  })

  if (res.status === 401 || res.status === 403) {
    throw new TokenExpiredError(accountName)
  }

  if (!res.ok) {
    throw new CodexFetchError(accountName, res.status)
  }

  const raw = (await res.json()) as CodexUsageRaw

  const { window5h, window7d } = classifyWindows(raw.rate_limit)

  // additional_rate_limits[0] → "7일 Spark" 자리 활용
  const spark = classifyWindows(raw.additional_rate_limits?.[0]?.rate_limit).window7d

  return {
    utilization5h: window5h.utilization,
    resetAt5h: window5h.resetAt,
    utilization7d: window7d.utilization,
    resetAt7d: window7d.resetAt,
    utilization7dSonnet: spark.utilization,
    resetAt7dSonnet: spark.resetAt,
    usedMessages: null,
    totalMessages: null,
    usagePercent: null,
    expiresAt: null,
    planName: null,
    resetAt: null,
    rawResponse: raw as Record<string, unknown>,
    cookieExpiresAt: null,
  }
}
