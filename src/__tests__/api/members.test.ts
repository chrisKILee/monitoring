jest.mock('@/lib/prisma', () => ({
  prisma: {
    member: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}))

import { GET, POST } from '@/app/api/members/route'
import { PATCH, DELETE } from '@/app/api/members/[id]/route'
import { prisma } from '@/lib/prisma'

const mp = prisma.member as jest.Mocked<typeof prisma.member>

const MEMBER = {
  id: 'm-1',
  name: '홍길동',
  purpose: '개발',
  startDate: new Date('2026-05-01'),
  endDate: new Date('2026-12-31'),
  serviceAccountId: 'sa-1',
  serviceAccount: { id: 'sa-1', accountName: 'claude_share_01' },
  createdAt: new Date(),
  updatedAt: new Date(),
}

beforeEach(() => jest.clearAllMocks())

describe('GET /api/members', () => {
  it('전체 목록을 반환해야 한다', async () => {
    mp.findMany.mockResolvedValue([MEMBER] as any)
    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body).toHaveLength(1)
    expect(body[0].name).toBe('홍길동')
  })
})

describe('POST /api/members', () => {
  it('정상 요청 시 201을 반환해야 한다', async () => {
    mp.create.mockResolvedValue(MEMBER as any)
    const req = new Request('http://localhost/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '홍길동', purpose: '개발' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })

  it('이름 누락 시 400을 반환해야 한다', async () => {
    const req = new Request('http://localhost/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purpose: '개발' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

describe('PATCH /api/members/[id]', () => {
  it('정상 수정 시 200을 반환해야 한다', async () => {
    mp.findUnique.mockResolvedValue(MEMBER as any)
    mp.update.mockResolvedValue({ ...MEMBER, name: '김철수' } as any)
    const req = new Request('http://localhost/api/members/m-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '김철수' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'm-1' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.name).toBe('김철수')
  })

  it('존재하지 않는 ID는 404를 반환해야 한다', async () => {
    mp.findUnique.mockResolvedValue(null)
    const req = new Request('http://localhost/api/members/not-exist', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '김철수' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'not-exist' }) })
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/members/[id]', () => {
  it('정상 삭제 시 200을 반환해야 한다', async () => {
    mp.findUnique.mockResolvedValue(MEMBER as any)
    mp.delete.mockResolvedValue(MEMBER as any)
    const req = new Request('http://localhost/api/members/m-1', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'm-1' }) })
    expect(res.status).toBe(200)
  })
})
