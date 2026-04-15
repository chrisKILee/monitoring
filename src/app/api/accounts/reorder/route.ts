import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const body = await req.json() as { order: string[] }

    if (!Array.isArray(body.order)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'order 배열이 필요합니다' } },
        { status: 400 }
      )
    }

    await prisma.$transaction(
      body.order.map((id, index) =>
        prisma.account.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    )

    return NextResponse.json({ data: { success: true } })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: String(err) } },
      { status: 500 }
    )
  }
}
