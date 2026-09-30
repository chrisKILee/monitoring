/**
 * Codex(wham/usage) 응답 파싱 테스트
 * - 윈도우 종류는 위치(primary/secondary)가 아니라 limit_window_seconds로 판별한다
 * - 5시간 제한이 사라진 현재 응답: primary_window가 7일, secondary_window는 null
 */
import { fetchCodexUsage } from '@/lib/codex-api'

const WEEK = 604800
const FIVE_HOURS = 18000

function mockResponse(body: unknown) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => body,
  }) as unknown as typeof fetch
}

describe('fetchCodexUsage', () => {
  it('primary_window가 7일이면 7d로 분류하고 5h는 null이다', async () => {
    mockResponse({
      rate_limit: {
        primary_window: { used_percent: 87, reset_at: 1791046714, limit_window_seconds: WEEK },
        secondary_window: null,
      },
    })

    const r = await fetchCodexUsage('t', 'acc')

    expect(r.utilization7d).toBe(87)
    expect(r.resetAt7d).toEqual(new Date(1791046714 * 1000))
    expect(r.utilization5h).toBeNull()
    expect(r.resetAt5h).toBeNull()
  })

  it('5시간 + 7일 윈도우가 함께 오면 각각 5h/7d로 분류한다', async () => {
    mockResponse({
      rate_limit: {
        primary_window: { used_percent: 10, reset_at: 1000, limit_window_seconds: FIVE_HOURS },
        secondary_window: { used_percent: 40, reset_at: 2000, limit_window_seconds: WEEK },
      },
    })

    const r = await fetchCodexUsage('t', 'acc')

    expect(r.utilization5h).toBe(10)
    expect(r.utilization7d).toBe(40)
    expect(r.resetAt7d).toEqual(new Date(2000 * 1000))
  })

  it('limit_window_seconds가 없는 구형 응답은 primary=5h, secondary=7d로 폴백한다', async () => {
    mockResponse({
      rate_limit: {
        primary_window: { used_percent: 5, reset_at: 1000 },
        secondary_window: { used_percent: 20, reset_at: 2000 },
      },
    })

    const r = await fetchCodexUsage('t', 'acc')

    expect(r.utilization5h).toBe(5)
    expect(r.utilization7d).toBe(20)
  })

  it('additional_rate_limits[0]의 7일 윈도우를 Spark 자리에 넣는다 (primary가 7일이어도)', async () => {
    mockResponse({
      rate_limit: {
        primary_window: { used_percent: 21, reset_at: 1000, limit_window_seconds: WEEK },
        secondary_window: null,
      },
      additional_rate_limits: [
        {
          limit_name: 'gpt-reserve',
          rate_limit: {
            primary_window: { used_percent: 3, reset_at: 3000, limit_window_seconds: WEEK },
            secondary_window: null,
          },
        },
      ],
    })

    const r = await fetchCodexUsage('t', 'acc')

    expect(r.utilization7dSonnet).toBe(3)
    expect(r.resetAt7dSonnet).toEqual(new Date(3000 * 1000))
  })

  it('윈도우가 전혀 없으면 모두 null이다', async () => {
    mockResponse({ rate_limit: { primary_window: null, secondary_window: null } })

    const r = await fetchCodexUsage('t', 'acc')

    expect(r.utilization5h).toBeNull()
    expect(r.utilization7d).toBeNull()
  })
})
