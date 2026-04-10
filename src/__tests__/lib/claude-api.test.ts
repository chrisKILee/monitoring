import { fetchUsage, CookieExpiredError, ClaudeFetchError } from '@/lib/claude-api'

const ORG_ID = 'test-org-123'
const COOKIES_JSON = JSON.stringify({ sessionKey: 'sk-ant-test', 'anthropic-device-id': 'dev-id' })

function mockFetch(status: number, body: unknown) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response)
}

afterEach(() => {
  jest.restoreAllMocks()
})

describe('fetchUsage', () => {
  it('정상 응답을 파싱하여 UsageResponse를 반환해야 한다', async () => {
    mockFetch(200, {
      used_messages: 350,
      total_messages: 1000,
      plan: 'Pro',
      expires_at: '2026-05-01T00:00:00.000Z',
      reset_at: '2026-04-30T00:00:00.000Z',
    })

    const result = await fetchUsage(ORG_ID, COOKIES_JSON)

    expect(result.usedMessages).toBe(350)
    expect(result.totalMessages).toBe(1000)
    expect(result.usagePercent).toBe(35)
    expect(result.planName).toBe('Pro')
    expect(result.expiresAt).toEqual(new Date('2026-05-01T00:00:00.000Z'))
    expect(result.rawResponse).toBeDefined()
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

  it('알 수 없는 필드가 있어도 rawResponse는 항상 반환해야 한다', async () => {
    mockFetch(200, { unknown_field: 'value', another: 42 })
    const result = await fetchUsage(ORG_ID, COOKIES_JSON)
    expect(result.rawResponse).toEqual({ unknown_field: 'value', another: 42 })
    expect(result.usedMessages).toBeNull()
    expect(result.totalMessages).toBeNull()
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

  it('usagePercent를 소수점 1자리로 반환해야 한다', async () => {
    mockFetch(200, { used_messages: 1, total_messages: 3 })
    const result = await fetchUsage(ORG_ID, COOKIES_JSON)
    expect(result.usagePercent).toBe(33.3)
  })
})
