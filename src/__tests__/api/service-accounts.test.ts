jest.mock('@/lib/prisma', () => ({
  prisma: {
    serviceAccount: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}))

import { GET, POST } from '@/app/api/service-accounts/route'
import { PATCH, DELETE } from '@/app/api/service-accounts/[id]/route'
import { prisma } from '@/lib/prisma'

const sp = prisma.serviceAccount as jest.Mocked<typeof prisma.serviceAccount>

const SA = {
  id: 'sa-1',
  accountName: 'claude_share_01',
  service: 'claude',
  phoneAuth: null,
  isShared: null,
  note: null,
  members: [],
  createdAt: new Date(),
  updatedAt: new Date(),
}

beforeEach(() => jest.clearAllMocks())

describe('GET /api/service-accounts', () => {
  it('members 포함 전체 목록을 반환해야 한다', async () => {
    sp.findMany.mockResolvedValue([SA] as any)
    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body[0].accountName).toBe('claude_share_01')
  })
})

describe('POST /api/service-accounts', () => {
  it('정상 생성 시 201을 반환해야 한다', async () => {
    sp.findUnique.mockResolvedValue(null)
    sp.create.mockResolvedValue(SA as any)
    const req = new Request('http://localhost/api/service-accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountName: 'claude_share_01', service: 'claude' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })

  it('accountName 중복 시 409를 반환해야 한다', async () => {
    sp.findUnique.mockResolvedValue(SA as any)
    const req = new Request('http://localhost/api/service-accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountName: 'claude_share_01', service: 'claude' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(409)
  })

  it('필수 필드 누락 시 400을 반환해야 한다', async () => {
    const req = new Request('http://localhost/api/service-accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service: 'claude' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

describe('PATCH /api/service-accounts/[id]', () => {
  it('정상 수정 시 200을 반환해야 한다', async () => {
    sp.findUnique.mockResolvedValue(SA as any)
    sp.update.mockResolvedValue({ ...SA, note: '수정됨' } as any)
    const req = new Request('http://localhost/api/service-accounts/sa-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: '수정됨' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'sa-1' }) })
    expect(res.status).toBe(200)
  })

  it('존재하지 않는 ID는 404를 반환해야 한다', async () => {
    sp.findUnique.mockResolvedValue(null)
    const req = new Request('http://localhost/api/service-accounts/no', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: '수정' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'no' }) })
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/service-accounts/[id]', () => {
  it('정상 삭제 시 200을 반환해야 한다', async () => {
    sp.findUnique.mockResolvedValue(SA as any)
    sp.delete.mockResolvedValue(SA as any)
    const req = new Request('http://localhost/api/service-accounts/sa-1', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'sa-1' }) })
    expect(res.status).toBe(200)
  })
})
