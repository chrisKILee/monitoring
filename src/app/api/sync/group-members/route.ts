import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

interface SyncMember {
  email: string
  name?: string | null
  department?: string | null
  title?: string | null
}

interface SyncBody {
  groupEmail?: string
  members?: SyncMember[]
}

function validateSecret(req: Request): boolean {
  const headerSecret = req.headers.get('x-sync-secret')
  const expected = process.env.SYNC_API_SECRET?.trim()
  if (!expected) return false
  return headerSecret?.trim() === expected
}

// Apps Script가 그룹 한 개의 멤버 리스트를 보내는 엔드포인트
// body: { groupEmail, members: [{ email, name?, department?, title? }] }
// 처리: Member upsert(email) + AccountMember 재구성(트랜잭션) + lastMemberSyncedAt 갱신
export async function POST(req: Request) {
  if (!validateSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: SyncBody
  try {
    body = (await req.json()) as SyncBody
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_JSON', message: '요청 body가 유효한 JSON이 아닙니다' } },
      { status: 400 },
    )
  }

  const { groupEmail, members } = body
  if (!groupEmail || !Array.isArray(members)) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'groupEmail과 members 배열이 필요합니다' } },
      { status: 400 },
    )
  }

  const account = await prisma.account.findUnique({ where: { name: groupEmail } })
  if (!account) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: `Account 없음: ${groupEmail}` } },
      { status: 404 },
    )
  }

  // 빈 이메일·중복 제거 + 정규화
  const normalized = members
    .map(m => ({
      email: (m.email ?? '').trim().toLowerCase(),
      name: m.name?.trim() || null,
      department: m.department?.trim() || null,
      title: m.title?.trim() || null,
    }))
    .filter(m => m.email.length > 0)

  const uniqueByEmail = Array.from(
    new Map(normalized.map(m => [m.email, m])).values(),
  )

  // 1. Member upsert (email 기준)
  const memberIds: string[] = []
  for (const m of uniqueByEmail) {
    const saved = await prisma.member.upsert({
      where: { email: m.email },
      create: { email: m.email, name: m.name, department: m.department, title: m.title },
      update: {
        // null 덮어쓰기 방지: 새 값이 있으면 갱신, 없으면 기존 유지
        ...(m.name !== null && { name: m.name }),
        ...(m.department !== null && { department: m.department }),
        ...(m.title !== null && { title: m.title }),
      },
      select: { id: true },
    })
    memberIds.push(saved.id)
  }

  // 2. AccountMember 재구성 — 트랜잭션으로 기존 모두 삭제 후 재생성
  await prisma.$transaction([
    prisma.accountMember.deleteMany({ where: { accountId: account.id } }),
    ...(memberIds.length > 0
      ? [
          prisma.accountMember.createMany({
            data: memberIds.map(memberId => ({ accountId: account.id, memberId })),
            skipDuplicates: true,
          }),
        ]
      : []),
    prisma.account.update({
      where: { id: account.id },
      data: { lastMemberSyncedAt: new Date() },
    }),
  ])

  return NextResponse.json({
    data: {
      accountId: account.id,
      groupEmail,
      memberCount: memberIds.length,
      syncedAt: new Date().toISOString(),
    },
  })
}
