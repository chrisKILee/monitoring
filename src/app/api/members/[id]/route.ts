import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

// 멤버 일부 필드 업데이트 (현재는 hidden 토글만 지원)
export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params
  let body: { hidden?: boolean }
  try {
    body = (await req.json()) as { hidden?: boolean }
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_JSON', message: '요청 body가 유효한 JSON이 아닙니다' } },
      { status: 400 },
    )
  }

  const member = await prisma.member.findUnique({ where: { id } })
  if (!member) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '멤버를 찾을 수 없습니다' } },
      { status: 404 },
    )
  }

  const updated = await prisma.member.update({
    where: { id },
    data: {
      ...(typeof body.hidden === 'boolean' && { hidden: body.hidden }),
    },
    select: { id: true, email: true, name: true, hidden: true },
  })

  return NextResponse.json({ data: updated })
}
