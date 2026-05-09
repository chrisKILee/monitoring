import { prisma } from '@/lib/prisma'

export type AlertType = 'EXPIRY_SOON' | 'EXCEED_5H' | 'EXCEED_7D' | 'FETCH_ERROR'

export async function sendAlert(
  accountId: string,
  accountName: string,
  type: AlertType,
  detail: string
): Promise<void> {
  const emoji: Record<AlertType, string> = {
    EXPIRY_SOON: '⚠️',
    EXCEED_5H: '🔴',
    EXCEED_7D: '🟡',
    FETCH_ERROR: '❌',
  }

  const message = `${emoji[type]} [claude-usage-monitor]\n*${accountName}* — ${detail}`

  await sendGoogleChat(message)
  await prisma.alertLog.create({
    data: { accountId, alertType: type, message },
  })
}

export async function sendGoogleChat(message: string): Promise<void> {
  const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL
  if (!webhookUrl) throw new Error('GOOGLE_CHAT_WEBHOOK_URL 환경변수가 설정되지 않았습니다')

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message }),
  })

  if (!res.ok) {
    throw new Error(`Google Chat 알람 발송 실패 (HTTP ${res.status})`)
  }
}
