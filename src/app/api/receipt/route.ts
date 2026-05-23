import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getPermissions } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { buildClaudeReceiptRow, buildCodexReceiptRow } from '@/lib/receipt-api'

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

  const accounts = await prisma.account.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      alias: true,
      aiTool: true,
      orgId: true,
      encryptedCookies: true,
      encryptedToken: true,
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  })

  const claudeAccounts = accounts.filter(
    a => a.aiTool === 'claude' && a.orgId && a.encryptedCookies
  ) as Array<typeof accounts[0] & { orgId: string; encryptedCookies: string }>

  const codexAccounts = accounts.filter(
    a => a.aiTool === 'codex' && a.encryptedToken
  ) as Array<typeof accounts[0] & { encryptedToken: string }>

  const [claudeResults, codexResults] = await Promise.all([
    Promise.allSettled(claudeAccounts.map(a => buildClaudeReceiptRow(a, yyyymm))),
    Promise.allSettled(codexAccounts.map(a => buildCodexReceiptRow(a, yyyymm))),
  ])

  const rows = [
    ...claudeResults.map((r, i) =>
      r.status === 'fulfilled'
        ? r.value
        : { accountId: claudeAccounts[i].id, aiTool: 'claude' as const, email: claudeAccounts[i].name, alias: claudeAccounts[i].alias, invoiceDate: null, amount: null, currency: null, status: null, last4: null, billingInterval: null, nextChargeDate: null, error: String((r as PromiseRejectedResult).reason) }
    ),
    ...codexResults.map((r, i) =>
      r.status === 'fulfilled'
        ? r.value
        : { accountId: codexAccounts[i].id, aiTool: 'codex' as const, email: codexAccounts[i].name, alias: codexAccounts[i].alias, invoiceDate: null, amount: null, currency: null, status: null, last4: null, billingInterval: null, nextChargeDate: null, error: String((r as PromiseRejectedResult).reason) }
    ),
  ]

  return NextResponse.json({ yyyymm, rows })
}

function currentYyyymm(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}${m}`
}
