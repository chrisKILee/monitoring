jest.mock('@/lib/prisma', () => ({
  prisma: {
    member: { findMany: jest.fn() },
    alertLog: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}))

jest.mock('@/lib/alert', () => ({
  sendGoogleChat: jest.fn(),
}))

import { GET } from '@/app/api/cron/member-expiry/route'
import { prisma } from '@/lib/prisma'
import { sendGoogleChat } from '@/lib/alert'

const mp = prisma.member as jest.Mocked<typeof prisma.member>
const alp = prisma.alertLog as jest.Mocked<typeof prisma.alertLog>
const mockChat = sendGoogleChat as jest.MockedFunction<typeof sendGoogleChat>

const CRON_SECRET = 'test-secret'

function makeReq() {
  return new Request('http://localhost/api/cron/member-expiry', {
    headers: { 'x-cron-secret': CRON_SECRET },
  })
}

function daysFromNow(n: number) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  d.setHours(0, 0, 0, 0)
  return d
}

beforeEach(() => {
  process.env.CRON_SECRET = CRON_SECRET
  jest.clearAllMocks()
})

afterEach(() => { delete process.env.CRON_SECRET })

describe('GET /api/cron/member-expiry', () => {
  it('CRON_SECRET 불일치 시 401을 반환해야 한다', async () => {
    const req = new Request('http://localhost/api/cron/member-expiry', {
      headers: { 'x-cron-secret': 'wrong' },
    })
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('D-5 대상 멤버에 Google Chat 알림을 발송해야 한다', async () => {
    const member = {
      id: 'm-1', name: '홍길동', purpose: '개발', endDate: daysFromNow(5),
      serviceAccount: { accountName: 'claude_share_01' },
    }
    mp.findMany.mockResolvedValue([member] as any)
    alp.findFirst.mockResolvedValue(null)
    alp.create.mockResolvedValue({} as any)
    mockChat.mockResolvedValue(undefined)

    const res = await GET(makeReq())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(mockChat).toHaveBeenCalledTimes(1)
    expect(alp.create).toHaveBeenCalledTimes(1)
    expect(body.sent).toBe(1)
  })

  it('이미 AlertLog가 있으면 중복 발송하지 않아야 한다', async () => {
    const member = {
      id: 'm-1', name: '홍길동', purpose: '개발', endDate: daysFromNow(5),
      serviceAccount: { accountName: 'claude_share_01' },
    }
    mp.findMany.mockResolvedValue([member] as any)
    alp.findFirst.mockResolvedValue({ id: 'log-1' } as any)
    mockChat.mockResolvedValue(undefined)

    const res = await GET(makeReq())
    const body = await res.json()

    expect(mockChat).not.toHaveBeenCalled()
    expect(body.sent).toBe(0)
    expect(body.skipped).toBe(1)
  })

  it('endDate가 null인 멤버는 스킵해야 한다', async () => {
    mp.findMany.mockResolvedValue([
      { id: 'm-2', name: '김철수', endDate: null, serviceAccount: null },
    ] as any)

    const res = await GET(makeReq())
    const body = await res.json()

    expect(mockChat).not.toHaveBeenCalled()
    expect(body.sent).toBe(0)
  })

  it('D-5, D-3, D-0 세 종류 알림이 독립적으로 발송되어야 한다', async () => {
    const members = [
      { id: 'm-1', name: 'D5', endDate: daysFromNow(5), serviceAccount: { accountName: 'acc1' } },
      { id: 'm-2', name: 'D3', endDate: daysFromNow(3), serviceAccount: { accountName: 'acc2' } },
      { id: 'm-3', name: 'D0', endDate: daysFromNow(0), serviceAccount: { accountName: 'acc3' } },
    ]
    mp.findMany.mockResolvedValue(members as any)
    alp.findFirst.mockResolvedValue(null)
    alp.create.mockResolvedValue({} as any)
    mockChat.mockResolvedValue(undefined)

    const res = await GET(makeReq())
    const body = await res.json()

    expect(mockChat).toHaveBeenCalledTimes(3)
    expect(body.sent).toBe(3)
  })
})
