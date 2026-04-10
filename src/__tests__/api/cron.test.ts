/**
 * Cron collect API 테스트
 * 외부 의존성(prisma, fetchUsage, sendAlert)은 모두 모킹
 */

// 모듈 모킹 (import 전에 선언)
jest.mock('@/lib/prisma', () => ({
  prisma: {
    account: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    usageLog: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}))

jest.mock('@/lib/claude-api', () => ({
  fetchUsage: jest.fn(),
  CookieExpiredError: class CookieExpiredError extends Error {},
  ClaudeFetchError: class ClaudeFetchError extends Error {},
}))

jest.mock('@/lib/crypto', () => ({
  decrypt: jest.fn((v: string) => v),
}))

jest.mock('@/lib/alert', () => ({
  sendAlert: jest.fn(),
}))

import { POST } from '@/app/api/cron/collect/route'
import { prisma } from '@/lib/prisma'
import { fetchUsage } from '@/lib/claude-api'
import { sendAlert } from '@/lib/alert'

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockFetchUsage = fetchUsage as jest.MockedFunction<typeof fetchUsage>
const mockSendAlert = sendAlert as jest.MockedFunction<typeof sendAlert>

const CRON_SECRET = 'test-secret'

function makeRequest(secret?: string) {
  return new Request('http://localhost/api/cron/collect', {
    method: 'POST',
    headers: secret ? { 'x-cron-secret': secret } : {},
  })
}

beforeEach(() => {
  process.env.CRON_SECRET = CRON_SECRET
  jest.clearAllMocks()
})

afterEach(() => {
  delete process.env.CRON_SECRET
})

describe('POST /api/cron/collect', () => {
  it('CRON_SECRET 불일치 시 401을 반환해야 한다', async () => {
    const res = await POST(makeRequest('wrong-secret'))
    expect(res.status).toBe(401)
  })

  it('CRON_SECRET 헤더 없으면 401을 반환해야 한다', async () => {
    const res = await POST(makeRequest())
    expect(res.status).toBe(401)
  })

  it('활성 계정이 없으면 collected:0을 반환해야 한다', async () => {
    ;(mockPrisma.account.findMany as jest.Mock).mockResolvedValue([])

    const res = await POST(makeRequest(CRON_SECRET))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.collected).toBe(0)
  })

  it('계정 수집 성공 시 UsageLog를 저장하고 collected 수를 반환해야 한다', async () => {
    ;(mockPrisma.account.findMany as jest.Mock).mockResolvedValue([
      { id: 'acc-1', name: '테스트계정', orgId: 'org-1', encryptedCookies: '{}' },
    ])
    mockFetchUsage.mockResolvedValue({
      usedMessages: 300,
      totalMessages: 1000,
      usagePercent: 30,
      expiresAt: new Date('2026-06-01'),
      planName: 'Pro',
      resetAt: null,
      rawResponse: {},
    })
    ;(mockPrisma.usageLog.findMany as jest.Mock).mockResolvedValue([])
    ;(mockPrisma.usageLog.create as jest.Mock).mockResolvedValue({})
    ;(mockPrisma.account.update as jest.Mock).mockResolvedValue({})

    const res = await POST(makeRequest(CRON_SECRET))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.collected).toBe(1)
    expect(mockPrisma.usageLog.create).toHaveBeenCalledTimes(1)
  })

  it('수집 실패 시 errors에 포함하고 알람을 발송해야 한다', async () => {
    ;(mockPrisma.account.findMany as jest.Mock).mockResolvedValue([
      { id: 'acc-1', name: '실패계정', orgId: 'org-1', encryptedCookies: '{}' },
    ])
    mockFetchUsage.mockRejectedValue(new Error('Network error'))
    ;(mockPrisma.account.update as jest.Mock).mockResolvedValue({})
    mockSendAlert.mockResolvedValue(undefined)

    const res = await POST(makeRequest(CRON_SECRET))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.collected).toBe(0)
    expect(body.errors).toHaveLength(1)
    expect(mockSendAlert).toHaveBeenCalledWith(
      'acc-1', '실패계정', 'FETCH_ERROR', expect.any(String)
    )
  })
})
