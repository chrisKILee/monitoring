import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getPermissions } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const yyyymm = searchParams.get('yyyymm') ?? currentYyyymm()

  if (!/^\d{6}$/.test(yyyymm)) {
    return NextResponse.json({ error: '잘못된 yyyymm 형식 (예: 202501)' }, { status: 400 })
  }

  if (session.user.role !== 'admin') {
    const perms = await getPermissions(session.user.id)
    if (!perms?.receiptRead) {
      return NextResponse.json({ error: '권한 없음' }, { status: 403 })
    }
  }

  const year = parseInt(yyyymm.slice(0, 4))
  const month = parseInt(yyyymm.slice(4, 6)) - 1 // 0-indexed
  const start = new Date(Date.UTC(year, month, 1))
  const end = new Date(Date.UTC(year, month + 1, 1))

  const receipts = await prisma.receipt.findMany({
    where: {
      invoiceDate: { gte: start, lt: end },
    },
    include: {
      account: { select: { name: true, alias: true } },
    },
    orderBy: [{ aiTool: 'asc' }, { invoiceDate: 'desc' }],
  })

  const rows = receipts.map(r => ({
    id: r.id,
    invoiceNumber: r.invoiceNumber,
    receiptNumber: r.receiptNumber,
    aiTool: r.aiTool as 'claude' | 'codex',
    email: r.email,
    alias: r.account?.alias ?? null,
    accountName: r.account?.name ?? null,
    invoiceDate: r.invoiceDate.toISOString(),
    amountExclTax: r.amountExclTax,
    currency: r.currency,
    status: r.status,
    last4: r.last4,
    description: r.description,
    periodStart: r.periodStart?.toISOString() ?? null,
    periodEnd: r.periodEnd?.toISOString() ?? null,
    nextChargeDate: r.nextChargeDate?.toISOString() ?? null,
  }))

  return NextResponse.json({ yyyymm, rows })
}

function currentYyyymm(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}${m}`
}
