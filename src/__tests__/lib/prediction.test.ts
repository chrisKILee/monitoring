import { predict, isExpiringSoon } from '@/lib/prediction'

function makeSnapshot(usedMessages: number, totalMessages: number, hoursAgo: number) {
  return {
    usedMessages,
    totalMessages,
    fetchedAt: new Date(Date.now() - hoursAgo * 3_600_000),
  }
}

describe('predict', () => {
  it('스냅샷이 1개 이하면 예측 불가로 반환해야 한다', () => {
    const result = predict([makeSnapshot(100, 1000, 0)])
    expect(result.predictExceed5h).toBe(false)
    expect(result.predictExceed7d).toBe(false)
    expect(result.hoursUntilExceed).toBeNull()
  })

  it('사용량 증가가 없으면 초과 없음으로 반환해야 한다', () => {
    const result = predict([
      makeSnapshot(100, 1000, 0),
      makeSnapshot(100, 1000, 5),
    ])
    expect(result.predictExceed5h).toBe(false)
    expect(result.predictExceed7d).toBe(false)
  })

  it('5h 내 초과 예측 — 빠른 사용 속도', () => {
    // 5시간에 900개 사용 → 잔여 100개 → 약 0.56h 후 초과
    const result = predict([
      makeSnapshot(900, 1000, 0),
      makeSnapshot(0, 1000, 5),
    ])
    expect(result.predictExceed5h).toBe(true)
    expect(result.predictExceed7d).toBe(true)
    expect(result.hoursUntilExceed).not.toBeNull()
    expect(result.hoursUntilExceed!).toBeLessThan(5)
  })

  it('7day 내 초과 예측 — 중간 사용 속도 (5h 이내 아님)', () => {
    // 24h에 50개 사용 → 잔여 950개 → 약 456h 후 초과 → 7d(168h) 이내 아님
    // 이 케이스를 조정: 24h에 500개 → 잔여 500개 → 24h 후 초과 → 7d 이내
    const result = predict([
      makeSnapshot(500, 1000, 0),
      makeSnapshot(0, 1000, 24),
    ])
    expect(result.predictExceed5h).toBe(false)
    expect(result.predictExceed7d).toBe(true)
    expect(result.hoursUntilExceed!).toBeGreaterThan(5)
    expect(result.hoursUntilExceed!).toBeLessThan(168)
  })

  it('7day 초과 예측 아님 — 느린 사용 속도', () => {
    // 24h에 10개 사용 → 잔여 990개 → 2376h 후 초과
    const result = predict([
      makeSnapshot(10, 1000, 0),
      makeSnapshot(0, 1000, 24),
    ])
    expect(result.predictExceed5h).toBe(false)
    expect(result.predictExceed7d).toBe(false)
    expect(result.hoursUntilExceed!).toBeGreaterThan(168)
  })

  it('이미 초과된 상태면 즉시 초과로 반환해야 한다', () => {
    const result = predict([
      makeSnapshot(1000, 1000, 0),
      makeSnapshot(900, 1000, 5),
    ])
    expect(result.predictExceed5h).toBe(true)
    expect(result.predictExceed7d).toBe(true)
    expect(result.hoursUntilExceed).toBe(0)
  })

  it('여러 스냅샷으로 정확한 추세를 계산해야 한다', () => {
    // 0h, 5h, 10h 전 순서대로 10, 5, 0개 사용 (시간당 1개)
    // 잔여 990개 → 990h 후 초과 (7d=168h 초과 아님)
    const snapshots = [
      makeSnapshot(10, 1000, 0),
      makeSnapshot(5, 1000, 5),
      makeSnapshot(0, 1000, 10),
    ]
    const result = predict(snapshots)
    expect(result.predictExceed5h).toBe(false)
    expect(result.predictExceed7d).toBe(false)
    expect(result.hoursUntilExceed).toBeCloseTo(990, 0)
  })
})

describe('isExpiringSoon', () => {
  it('7일 이내 만료면 true를 반환해야 한다', () => {
    const expiresAt = new Date(Date.now() + 3 * 24 * 3_600_000) // 3일 후
    expect(isExpiringSoon(expiresAt)).toBe(true)
  })

  it('7일 이후 만료면 false를 반환해야 한다', () => {
    const expiresAt = new Date(Date.now() + 10 * 24 * 3_600_000) // 10일 후
    expect(isExpiringSoon(expiresAt)).toBe(false)
  })

  it('이미 만료된 날짜는 false를 반환해야 한다', () => {
    const expiresAt = new Date(Date.now() - 1000)
    expect(isExpiringSoon(expiresAt)).toBe(false)
  })

  it('커스텀 임계값(3일)으로 판단할 수 있어야 한다', () => {
    const expiresAt = new Date(Date.now() + 5 * 24 * 3_600_000) // 5일 후
    expect(isExpiringSoon(expiresAt, 3)).toBe(false)
    expect(isExpiringSoon(expiresAt, 7)).toBe(true)
  })
})
