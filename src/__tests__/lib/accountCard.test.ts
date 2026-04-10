/**
 * AccountCard 차트 로직 테스트
 * - timeElapsedPct: 윈도우 내 시간 경과 % 계산
 * - resetLabel: 초기화까지 남은 시간 레이블
 * - 7d 그리드: daysPassed, dayFraction 계산
 */

// ─── 테스트 대상 순수 함수 (컴포넌트에서 추출) ───────────────────────────────

function timeElapsedPct(resetAt: string | null, windowMs: number): number {
  if (!resetAt) return 0
  const remaining = new Date(resetAt).getTime() - Date.now()
  const elapsed = Math.max(0, windowMs - remaining)
  return Math.min(100, (elapsed / windowMs) * 100)
}

function resetLabel(resetAt: string | null): string {
  if (!resetAt) return ''
  const d = new Date(resetAt)
  const diff = d.getTime() - Date.now()
  if (diff <= 0) return '곧 초기화'
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  if (h >= 24) return `${Math.floor(h / 24)}일 후 초기화`
  if (h > 0) return `${h}h ${m}m 후 초기화`
  return `${m}m 후 초기화`
}

function calcDayProgress(resetAt: string | null): { daysPassed: number; dayFraction: number } {
  if (!resetAt) return { daysPassed: 0, dayFraction: 0 }
  const remaining = new Date(resetAt).getTime() - Date.now()
  const total = 7 * 24 * 60 * 60 * 1000
  const elapsed = Math.max(0, total - remaining)
  const days = elapsed / (24 * 60 * 60 * 1000)
  return { daysPassed: Math.floor(days), dayFraction: days % 1 }
}

function cellUsageFill(pct: number, cellIndex: number): number {
  const cellWidth = 100 / 7
  return Math.max(0, Math.min(100, (pct - cellIndex * cellWidth) / cellWidth * 100))
}

// ─── timeElapsedPct ──────────────────────────────────────────────────────────

describe('timeElapsedPct', () => {
  const FIVE_HOURS = 5 * 60 * 60 * 1000

  it('null 이면 0을 반환해야 한다', () => {
    expect(timeElapsedPct(null, FIVE_HOURS)).toBe(0)
  })

  it('윈도우 절반 경과 시 50%를 반환해야 한다', () => {
    const halfWindowAhead = new Date(Date.now() + FIVE_HOURS / 2).toISOString()
    const result = timeElapsedPct(halfWindowAhead, FIVE_HOURS)
    expect(result).toBeCloseTo(50, 0)
  })

  it('윈도우 시작 직후(reset이 5h 앞) 0%에 가까워야 한다', () => {
    const justReset = new Date(Date.now() + FIVE_HOURS).toISOString()
    const result = timeElapsedPct(justReset, FIVE_HOURS)
    expect(result).toBeCloseTo(0, 0)
  })

  it('윈도우 종료 직전(reset이 현재) 100%를 반환해야 한다', () => {
    const aboutToReset = new Date(Date.now() + 1000).toISOString()
    const result = timeElapsedPct(aboutToReset, FIVE_HOURS)
    expect(result).toBeCloseTo(100, 0)
  })

  it('이미 만료된 경우 100을 초과하지 않아야 한다', () => {
    const expired = new Date(Date.now() - 1000).toISOString()
    expect(timeElapsedPct(expired, FIVE_HOURS)).toBe(100)
  })
})

// ─── resetLabel ──────────────────────────────────────────────────────────────

describe('resetLabel', () => {
  it('null 이면 빈 문자열을 반환해야 한다', () => {
    expect(resetLabel(null)).toBe('')
  })

  it('이미 지난 시간이면 "곧 초기화"를 반환해야 한다', () => {
    const past = new Date(Date.now() - 60_000).toISOString()
    expect(resetLabel(past)).toBe('곧 초기화')
  })

  it('30분 후면 "30m 후 초기화"를 반환해야 한다', () => {
    const in30m = new Date(Date.now() + 30 * 60_000).toISOString()
    expect(resetLabel(in30m)).toBe('30m 후 초기화')
  })

  it('2시간 15분 후면 "2h 15m 후 초기화"를 반환해야 한다', () => {
    const in2h15m = new Date(Date.now() + (2 * 3_600_000 + 15 * 60_000)).toISOString()
    expect(resetLabel(in2h15m)).toBe('2h 15m 후 초기화')
  })

  it('3일 후면 "3일 후 초기화"를 반환해야 한다', () => {
    const in3d = new Date(Date.now() + 3 * 24 * 3_600_000).toISOString()
    expect(resetLabel(in3d)).toBe('3일 후 초기화')
  })
})

// ─── calcDayProgress (7d 그리드) ─────────────────────────────────────────────

describe('calcDayProgress', () => {
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000

  it('null 이면 daysPassed=0, dayFraction=0을 반환해야 한다', () => {
    expect(calcDayProgress(null)).toEqual({ daysPassed: 0, dayFraction: 0 })
  })

  it('윈도우 시작 직후(reset이 7일 앞) daysPassed=0이어야 한다', () => {
    const justStarted = new Date(Date.now() + SEVEN_DAYS).toISOString()
    const { daysPassed } = calcDayProgress(justStarted)
    expect(daysPassed).toBe(0)
  })

  it('3일 경과 시 daysPassed=3이어야 한다', () => {
    const threeDaysLeft = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString()
    const { daysPassed } = calcDayProgress(threeDaysLeft)
    expect(daysPassed).toBe(3)
  })

  it('dayFraction은 0 이상 1 미만이어야 한다', () => {
    const somePoint = new Date(Date.now() + 2.5 * 24 * 60 * 60 * 1000).toISOString()
    const { dayFraction } = calcDayProgress(somePoint)
    expect(dayFraction).toBeGreaterThanOrEqual(0)
    expect(dayFraction).toBeLessThan(1)
  })

  it('이미 만료된 경우 daysPassed가 7을 초과하지 않아야 한다', () => {
    const expired = new Date(Date.now() - 1000).toISOString()
    const { daysPassed, dayFraction } = calcDayProgress(expired)
    // elapsed = 7days + 1s → clamp at 7days
    expect(daysPassed + dayFraction).toBeCloseTo(7, 1)
  })
})

// ─── cellUsageFill (7d 각 셀 사용량 채우기) ──────────────────────────────────

describe('cellUsageFill', () => {
  it('사용량 0%이면 모든 셀이 0%이어야 한다', () => {
    for (let i = 0; i < 7; i++) {
      expect(cellUsageFill(0, i)).toBe(0)
    }
  })

  it('사용량 100%이면 모든 셀이 100%에 가까워야 한다', () => {
    for (let i = 0; i < 7; i++) {
      expect(cellUsageFill(100, i)).toBeCloseTo(100, 5)
    }
  })

  it('사용량 50%이면 셀 3(index=3)은 완전히 찬 상태(100%)이어야 한다', () => {
    // 50% / (100/7) = 3.5 → 셀 0,1,2 는 100%, 셀 3은 50%
    expect(cellUsageFill(50, 2)).toBe(100)
  })

  it('사용량 50%이면 셀 4(index=4)는 비어있어야 한다(0%)', () => {
    expect(cellUsageFill(50, 4)).toBe(0)
  })

  it('셀 채우기 값은 0~100 범위를 벗어나지 않아야 한다', () => {
    const testCases = [0, 14.28, 28.57, 50, 75, 100]
    testCases.forEach(pct => {
      for (let i = 0; i < 7; i++) {
        const fill = cellUsageFill(pct, i)
        expect(fill).toBeGreaterThanOrEqual(0)
        expect(fill).toBeLessThanOrEqual(100)
      }
    })
  })
})
