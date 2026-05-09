import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendGoogleChat } from '@/lib/alert'

const EXPIRY_DAYS = [5, 3, 0] as const
type ExpiryDay = (typeof EXPIRY_DAYS)[number]

const ALERT_TYPE: Record<ExpiryDay, string> = {
  5: 'MEMBER_EXPIRY_D5',
  3: 'MEMBER_EXPIRY_D3',
  0: 'MEMBER_EXPIRY_D0',
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function daysUntil(endDate: Date): number {
  const today = startOfDay(new Date())
  const end = startOfDay(endDate)
  return Math.round((end.getTime() - today.getTime()) / 86_400_000)
}

export async function GET(req: Request) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = startOfDay(new Date())
  const maxDate = new Date(today)
  maxDate.setDate(today.getDate() + 5)

  const members = await prisma.member.findMany({
    where: { endDate: { gte: today, lte: maxDate } },
    include: { serviceAccount: { select: { accountName: true } } },
  })

  let sent = 0
  let skipped = 0

  for (const member of members) {
    if (!member.endDate) continue
    const days = daysUntil(member.endDate)
    const trigger = EXPIRY_DAYS.find(d => d === days)
    if (trigger === undefined) continue

    const alertType = ALERT_TYPE[trigger]
    const todayStr = today.toISOString().slice(0, 10)

    const alreadySent = await prisma.alertLog.findFirst({
      where: {
        alertType,
        message: { contains: member.id },
        sentAt: { gte: today },
      },
    })

    if (alreadySent) {
      skipped++
      continue
    }

    const label = days === 0 ? '당일' : `D-${days}`
    const account = member.serviceAccount?.accountName ?? '-'
    const message = [
      `🔔 *[AI 계정 만료 ${label}]*`,
      `*이름*: ${member.name}`,
      `*계정*: ${account}`,
      ...(member.purpose ? [`*목적*: ${member.purpose}`] : []),
      `*종료일*: ${member.endDate.toLocaleDateString('ko-KR')} (${label})`,
    ].join('\n')

    await sendGoogleChat(message)
    await prisma.alertLog.create({
      data: {
        accountId: 'system',
        alertType,
        message: `${member.id}|${member.name}|${todayStr}`,
      },
    })
    sent++
  }

  return NextResponse.json({ sent, skipped, total: members.length })
}
