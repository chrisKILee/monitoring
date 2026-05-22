import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchUsage, CookieExpiredError } from '@/lib/claude-api'
import { fetchCodexUsage, TokenExpiredError } from '@/lib/codex-api'
import { decrypt } from '@/lib/crypto'
import { isExpiringSoon } from '@/lib/prediction'
import { sendAlert } from '@/lib/alert'

const EXCEED_THRESHOLD = 90

type Params = { params: Promise<{ id: string }> }

export async function POST(_req: Request, { params }: Params) {
  const { id } = await params

  const account = await prisma.account.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      aiTool: true,
      orgId: true,
      encryptedCookies: true,
      encryptedToken: true,
    },
  })
  if (!account) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '계정을 찾을 수 없습니다' } },
      { status: 404 }
    )
  }

  const isCodex = account.aiTool === 'codex'

  if (!isCodex && (!account.orgId || !account.encryptedCookies)) {
    return NextResponse.json(
      { error: { code: 'UNSUPPORTED', message: 'Claude 계정에 orgId 또는 쿠키가 없습니다' } },
      { status: 400 }
    )
  }

  if (isCodex && !account.encryptedToken) {
    return NextResponse.json(
      { error: { code: 'UNSUPPORTED', message: 'Codex 계정에 토큰이 없습니다. 토큰을 먼저 등록해주세요.' } },
      { status: 400 }
    )
  }

  try {
    const usage = isCodex
      ? await fetchCodexUsage(decrypt(account.encryptedToken!), account.name)
      : await fetchUsage(account.orgId!, decrypt(account.encryptedCookies!))

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
        ...(!isCodex && usage.cookieExpiresAt && { cookieExpiresAt: usage.cookieExpiresAt }),
      },
    })

    if (predictExceed5h) {
      await sendAlert(account.id, account.name, 'EXCEED_5H', `5시간 윈도우 사용량 ${usage.utilization5h}% (90% 초과)`)
    } else if (predictExceed7d) {
      await sendAlert(account.id, account.name, 'EXCEED_7D', `7일 윈도우 사용량 ${usage.utilization7d}% (90% 초과)`)
    }

    if (usage.expiresAt && isExpiringSoon(usage.expiresAt)) {
      const days = Math.ceil((usage.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      await sendAlert(account.id, account.name, 'EXPIRY_SOON', `만료 ${days}일 전 (${usage.expiresAt.toLocaleDateString('ko-KR')})`)
    }

    return NextResponse.json({ data: { success: true, utilization5h: usage.utilization5h, utilization7d: usage.utilization7d } })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const alertType = (err instanceof CookieExpiredError || err instanceof TokenExpiredError) ? 'FETCH_ERROR' : 'FETCH_ERROR'

    await prisma.account.update({
      where: { id: account.id },
      data: { lastError: message },
    })

    await sendAlert(account.id, account.name, alertType, message)

    return NextResponse.json(
      { error: { code: 'FETCH_ERROR', message } },
      { status: 502 }
    )
  }
}
