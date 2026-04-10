import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchUsage, CookieExpiredError } from '@/lib/claude-api'
import { decrypt } from '@/lib/crypto'
import { predict, isExpiringSoon } from '@/lib/prediction'
import { sendAlert } from '@/lib/alert'

function validateSecret(req: Request): boolean {
  const headerSecret = req.headers.get('x-cron-secret')
  const urlSecret = new URL(req.url).searchParams.get('secret')
  const expected = process.env.CRON_SECRET?.trim()
  if (!expected) return false
  return (headerSecret?.trim() === expected) || (urlSecret?.trim() === expected)
}

export async function GET(req: Request) {
  if (!validateSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return runCollect()
}

export async function POST(req: Request) {
  if (!validateSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return runCollect()
}

async function runCollect() {
  const accounts = await prisma.account.findMany({
    where: { isActive: true },
  })

  const results = await Promise.allSettled(
    accounts.map(account => collectAccount(account))
  )

  const collected = results.filter(r => r.status === 'fulfilled').length
  const errors = results
    .map((r, i) => ({ r, account: accounts[i] }))
    .filter(({ r }) => r.status === 'rejected')
    .map(({ r, account }) => `[${account.name}] ${String((r as PromiseRejectedResult).reason)}`)

  return NextResponse.json({ collected, errors, total: accounts.length })
}

async function collectAccount(account: {
  id: string
  name: string
  orgId: string
  encryptedCookies: string
}) {
  try {
    const cookiesJson = decrypt(account.encryptedCookies)
    const usage = await fetchUsage(account.orgId, cookiesJson)

    // 최근 스냅샷 조회 (예측용)
    const recentLogs = await prisma.usageLog.findMany({
      where: { accountId: account.id },
      orderBy: { fetchedAt: 'desc' },
      take: 12,
    })

    const snapshots = recentLogs
      .filter(l => l.usedMessages !== null && l.totalMessages !== null)
      .map(l => ({
        usedMessages: l.usedMessages!,
        totalMessages: l.totalMessages!,
        fetchedAt: l.fetchedAt,
      }))

    const prediction = predict(snapshots)

    await prisma.usageLog.create({
      data: {
        accountId: account.id,
        rawResponse: usage.rawResponse as object,
        usedMessages: usage.usedMessages,
        totalMessages: usage.totalMessages,
        usagePercent: usage.usagePercent,
        expiresAt: usage.expiresAt,
        planName: usage.planName,
        resetAt: usage.resetAt,
        predictExceed5h: prediction.predictExceed5h,
        predictExceed7d: prediction.predictExceed7d,
      },
    })

    await prisma.account.update({
      where: { id: account.id },
      data: { lastFetchedAt: new Date(), lastError: null },
    })

    // 알람 판단
    if (prediction.predictExceed5h) {
      await sendAlert(account.id, account.name, 'EXCEED_5H', '현재 속도로 5시간 내 쿼터 초과 예상')
    } else if (prediction.predictExceed7d) {
      await sendAlert(account.id, account.name, 'EXCEED_7D', '현재 속도로 7일 내 쿼터 초과 예상')
    }

    if (usage.expiresAt && isExpiringSoon(usage.expiresAt)) {
      const days = Math.ceil(
        (usage.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
      await sendAlert(account.id, account.name, 'EXPIRY_SOON', `만료 ${days}일 전 (${usage.expiresAt.toLocaleDateString('ko-KR')})`)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const alertType = err instanceof CookieExpiredError ? 'FETCH_ERROR' : 'FETCH_ERROR'

    await prisma.account.update({
      where: { id: account.id },
      data: { lastError: message },
    })

    await sendAlert(account.id, account.name, alertType, message)
    throw err
  }
}
