import { fetchUsage, CookieExpiredError, ClaudeFetchError } from '@/lib/claude-api'

const ORG_ID = 'test-org-123'
const COOKIES_JSON = JSON.stringify({ sessionKey: 'sk-ant-test', 'anthropic-device-id': 'dev-id' })

function mockFetch(status: number, body: unknown) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    headers: { get: () => null, getSetCookie: () => [] },
  } as unknown as Response)
}

afterEach(() => {
  jest.restoreAllMocks()
})

describe('fetchUsage', () => {
  it('실제 API 응답(five_hour/seven_day)을 파싱해야 한다', async () => {
    mockFetch(200, {
      five_hour: { utilization: 7, resets_at: '2026-04-10T18:00:00.000Z' },
      seven_day: { utilization: 36, resets_at: '2026-04-14T08:00:00.000Z' },
      seven_day_sonnet: { utilization: 27, resets_at: '2026-04-15T00:00:00.000Z' },
      extra_usage: { is_enabled: true, used_credits: 0, monthly_limit: 2000 },
    })

    const result = await fetchUsage(ORG_ID, COOKIES_JSON)

    expect(result.utilization5h).toBe(7)
    expect(result.resetAt5h).toEqual(new Date('2026-04-10T18:00:00.000Z'))
    expect(result.utilization7d).toBe(36)
    expect(result.resetAt7d).toEqual(new Date('2026-04-14T08:00:00.000Z'))
    expect(result.utilization7dSonnet).toBe(27)
    expect(result.resetAt7dSonnet).toEqual(new Date('2026-04-15T00:00:00.000Z'))
    expect(result.rawResponse).toBeDefined()
  })

  it('seven_day_sonnet가 null이면 utilization7dSonnet은 null이어야 한다', async () => {
    mockFetch(200, {
      five_hour: { utilization: 5, resets_at: '2026-04-10T18:00:00.000Z' },
      seven_day: { utilization: 40, resets_at: '2026-04-14T08:00:00.000Z' },
      seven_day_sonnet: null,
    })

    const result = await fetchUsage(ORG_ID, COOKIES_JSON)

    expect(result.utilization7dSonnet).toBeNull()
    expect(result.resetAt7dSonnet).toBeNull()
  })

  it('빈 응답이어도 rawResponse는 항상 반환해야 한다', async () => {
    mockFetch(200, { unknown_field: 'value' })
    const result = await fetchUsage(ORG_ID, COOKIES_JSON)
    expect(result.rawResponse).toEqual({ unknown_field: 'value' })
    expect(result.utilization5h).toBeNull()
    expect(result.utilization7d).toBeNull()
  })

  it('401 응답은 CookieExpiredError를 던져야 한다', async () => {
    mockFetch(401, {})
    await expect(fetchUsage(ORG_ID, COOKIES_JSON)).rejects.toThrow(CookieExpiredError)
  })

  it('403 응답은 CookieExpiredError를 던져야 한다', async () => {
    mockFetch(403, {})
    await expect(fetchUsage(ORG_ID, COOKIES_JSON)).rejects.toThrow(CookieExpiredError)
  })

  it('500 응답은 ClaudeFetchError를 던져야 한다', async () => {
    mockFetch(500, {})
    await expect(fetchUsage(ORG_ID, COOKIES_JSON)).rejects.toThrow(ClaudeFetchError)
  })

  it('올바른 URL과 쿠키 헤더로 fetch를 호출해야 한다', async () => {
    mockFetch(200, {})
    await fetchUsage(ORG_ID, COOKIES_JSON)

    expect(global.fetch).toHaveBeenCalledWith(
      `https://claude.ai/api/organizations/${ORG_ID}/usage`,
      expect.objectContaining({
        headers: expect.objectContaining({
          cookie: expect.stringContaining('sessionKey=sk-ant-test'),
        }),
      })
    )
  })
})
