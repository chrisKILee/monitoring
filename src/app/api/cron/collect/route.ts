import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchUsage, CookieExpiredError } from '@/lib/claude-api'
import { decrypt } from '@/lib/crypto'
import { isExpiringSoon } from '@/lib/prediction'
import { sendAlert } from '@/lib/alert'

const EXCEED_THRESHOLD = 90  // utilization % 기준

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

  // 동시 요청 시 Claude.ai 세션 충돌 방지 — 순차 실행 + 3초 간격
  const results: PromiseSettledResult<void>[] = []
  for (let i = 0; i < accounts.length; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, 3000))
    results.push(
      await collectAccount(accounts[i])
        .then(() => ({ status: 'fulfilled' as const, value: undefined }))
        .catch((reason) => ({ status: 'rejected' as const, reason }))
    )
  }

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

    // utilization 기반 예측 (5h/7d 윈도우 utilization >= 90% 이면 초과 예상)
    const predictExceed5h = (usage.utilization5h ?? 0) >= EXCEED_THRESHOLD
    const predictExceed7d = (usage.utilization7d ?? 0) >= EXCEED_THRESHOLD

    await prisma.usageLog.create({
      data: {
        accountId: account.id,
        rawResponse: usage.rawResponse as object,
        utilization5h: usage.utilization5h,
        resetAt5h: usage.resetAt5h,
        utilization7d: usage.utilization7d,
        resetAt7d: usage.resetAt7d,
        utilization7dSonnet: usage.utilization7dSonnet,
        resetAt7dSonnet: usage.resetAt7dSonnet,
        // 하위 호환 필드
        usedMessages: usage.usedMessages,
        totalMessages: usage.totalMessages,
        usagePercent: usage.usagePercent,
        expiresAt: usage.expiresAt,
        planName: usage.planName,
        resetAt: usage.resetAt,
        predictExceed5h,
        predictExceed7d,
      },
    })

    await prisma.account.update({
      where: { id: account.id },
      data: {
        lastFetchedAt: new Date(),
        lastError: null,
        ...(usage.cookieExpiresAt && { cookieExpiresAt: usage.cookieExpiresAt }),
      },
    })

    // 알람 판단
    if (predictExceed5h) {
      await sendAlert(account.id, account.name, 'EXCEED_5H', `5시간 윈도우 사용량 ${usage.utilization5h}% (90% 초과)`)
    } else if (predictExceed7d) {
      await sendAlert(account.id, account.name, 'EXCEED_7D', `7일 윈도우 사용량 ${usage.utilization7d}% (90% 초과)`)
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
