/**
 * member-utils 테스트
 * - dedupeMemberNames: ServiceAccount[] → 중복 제거된 멤버 이름 배열 (가나다순)
 */
import { dedupeMemberNames, type ServiceAccountWithMembers } from '@/lib/member-utils'

function makeServiceAccount(memberNames: string[]): ServiceAccountWithMembers {
  return {
    memberLinks: memberNames.map(name => ({ member: { name } })),
  }
}

describe('dedupeMemberNames', () => {
  it('빈 배열을 입력하면 빈 배열을 반환해야 한다', () => {
    expect(dedupeMemberNames([])).toEqual([])
  })

  it('ServiceAccount는 있지만 memberLinks가 비어있으면 빈 배열을 반환해야 한다', () => {
    const input = [makeServiceAccount([])]
    expect(dedupeMemberNames(input)).toEqual([])
  })

  it('서로 다른 멤버를 가나다순으로 정렬해야 한다', () => {
    const input = [makeServiceAccount(['홍길동', '김철수', '박영희'])]
    expect(dedupeMemberNames(input)).toEqual(['김철수', '박영희', '홍길동'])
  })

  it('동일 멤버가 여러 ServiceAccount에 매핑되면 1번만 카운트되어야 한다', () => {
    const input = [
      makeServiceAccount(['김철수', '박영희']),
      makeServiceAccount(['김철수', '홍길동']),
    ]
    expect(dedupeMemberNames(input)).toEqual(['김철수', '박영희', '홍길동'])
  })

  it('영문 이름도 정렬되어야 한다', () => {
    const input = [makeServiceAccount(['Charlie', 'Alice', 'Bob'])]
    expect(dedupeMemberNames(input)).toEqual(['Alice', 'Bob', 'Charlie'])
  })

  it('한 ServiceAccount 안에서 같은 멤버가 중복되어도 1번만 카운트되어야 한다', () => {
    // 데이터 정합성상 발생하지 않지만 방어적 처리 확인
    const input = [makeServiceAccount(['김철수', '김철수', '박영희'])]
    expect(dedupeMemberNames(input)).toEqual(['김철수', '박영희'])
  })
})
