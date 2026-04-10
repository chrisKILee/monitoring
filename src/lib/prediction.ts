export interface UsageSnapshot {
  usedMessages: number
  totalMessages: number
  fetchedAt: Date
}

export interface PredictionResult {
  predictExceed5h: boolean
  predictExceed7d: boolean
  hoursUntilExceed: number | null
}

const HOURS_5 = 5
const HOURS_7D = 24 * 7

export function predict(snapshots: UsageSnapshot[]): PredictionResult {
  if (snapshots.length < 2) {
    return { predictExceed5h: false, predictExceed7d: false, hoursUntilExceed: null }
  }

  // 최신순 정렬
  const sorted = [...snapshots].sort(
    (a, b) => b.fetchedAt.getTime() - a.fetchedAt.getTime()
  )

  const newest = sorted[0]
  const oldest = sorted[sorted.length - 1]

  const elapsedMs = newest.fetchedAt.getTime() - oldest.fetchedAt.getTime()
  const elapsedHours = elapsedMs / 3_600_000

  if (elapsedHours === 0) {
    return { predictExceed5h: false, predictExceed7d: false, hoursUntilExceed: null }
  }

  const usedDelta = newest.usedMessages - oldest.usedMessages
  if (usedDelta <= 0) {
    return { predictExceed5h: false, predictExceed7d: false, hoursUntilExceed: null }
  }

  const messagesPerHour = usedDelta / elapsedHours
  const remaining = newest.totalMessages - newest.usedMessages

  if (remaining <= 0) {
    return { predictExceed5h: true, predictExceed7d: true, hoursUntilExceed: 0 }
  }

  const hoursUntilExceed = remaining / messagesPerHour

  return {
    predictExceed5h: hoursUntilExceed < HOURS_5,
    predictExceed7d: hoursUntilExceed < HOURS_7D,
    hoursUntilExceed,
  }
}

export function isExpiringSoon(expiresAt: Date, thresholdDays = 7): boolean {
  const msUntilExpiry = expiresAt.getTime() - Date.now()
  const daysUntilExpiry = msUntilExpiry / (1000 * 60 * 60 * 24)
  return daysUntilExpiry >= 0 && daysUntilExpiry < thresholdDays
}
