# SPEC - 대시보드 AccountCard 멤버 표시

> 작성일: 2026-05-15
> 상태: 진행 중

## 1. 목적

대시보드의 각 `AccountCard`에 해당 Claude.ai 계정을 실제로 사용하는 멤버 수와 이름을 보여준다. 사용량 차트와 사용 인원을 한 곳에서 확인할 수 있게 한다.

## 2. 데이터 흐름

```
Account
  └─ serviceAccounts (Account.id → ServiceAccount.accountId)
      └─ memberLinks (ServiceAccount → MemberServiceAccount)
          └─ member (MemberServiceAccount.memberId → Member.id)
              ↓
        Account 단위로 unique한 멤버 이름 집합
```

같은 Member가 한 Account 안에서 여러 ServiceAccount에 연결될 수 있으므로 **이름 기준으로 중복 제거**한다.

## 3. 영향 범위 (전수 조사)

- `src/app/dashboard/page.tsx:10` — `prisma.account.findMany` select 확장
- `src/components/dashboard/AccountCard.tsx:24` — `AccountLatest` 타입 + 카드 푸터에 아코디언 섹션 추가
- 신규: `src/lib/member-utils.ts` — 순수 함수 (중복 제거, 정렬)
- 신규: `src/__tests__/lib/member-utils.test.ts` — 단위 테스트

연쇄 영향 없음:
- API/Cron 로직 영향 없음
- `AccountCard` props 시그니처는 추가만 (`members?: string[]`) — optional이라 다른 호출처 영향 없음 (현재 dashboard만 사용)

## 4. 성공 케이스

- A1. 멤버 0명 Account → 멤버 섹션 자체가 렌더되지 않음
- A2. 멤버 3명 (서로 다른 사람) → "멤버 3명 ▼" + 아코디언 펼치면 3명 이름
- A3. 같은 Account에 같은 멤버가 ServiceAccount 2개로 매핑됨 → 1명으로 카운트
- A4. 한국어 이름 → 가나다순 정렬

## 5. 실패/엣지 케이스

- E1. ServiceAccount는 있는데 memberLinks가 비어있음 → 0명, 미표시
- E2. 같은 이름의 다른 사람이 있을 가능성은 사용자 운영상 없다고 가정 (이름이 unique key 역할)
- E3. `serviceAccounts` 자체가 빈 배열 → 0명, 미표시
- E4. 아코디언 초기 상태는 접힘(collapsed)

## 6. UI 명세

위치: `AccountCard`의 마지막 콘텐츠 (`fetchedAt` 시각 위)

레이아웃:
```
┌──── AccountCard ────┐
│ ...                  │
│ [Usage48hChart]      │
│                      │
│ 멤버 N명         ▼  │ ← 클릭 토글 (button)
│  • 이름1             │ ← 펼친 상태
│  • 이름2             │
│  ...                 │
│                      │
│ 2026-05-15 10:30...  │ (fetchedAt)
└──────────────────────┘
```

- 토글 버튼: 좌측 "멤버 N명", 우측 ▼/▲ 화살표
- 펼친 상태: 들여쓰기 + `•` 불릿
- 0명 → 토글 영역 자체 미표시
- 접근성: `aria-expanded`, `aria-controls`

## 7. TDD 절차

```
[Red]
  src/__tests__/lib/member-utils.test.ts 작성
  - dedupeMemberNames([]) === []
  - dedupeMemberNames([{name:'A'}, {name:'B'}]) → ['A','B'] (가나다)
  - dedupeMemberNames([{name:'B'}, {name:'A'}, {name:'B'}]) → ['A','B']
  - dedupeMemberNames([{name:'홍길동'}, {name:'김철수'}]) → ['김철수','홍길동']
  → npm test로 Red 확인

[Green]
  src/lib/member-utils.ts 구현 (Set + Array.sort + localeCompare 'ko')

[Refactor]
  필요시 정리

[UI 통합]
  page.tsx fetch에 serviceAccounts.memberLinks.member 포함
  page.tsx에서 dedupeMemberNames(account.serviceAccounts) 호출 → AccountCard에 전달
  AccountCard에 props 추가 + 아코디언 컴포넌트
```

## 8. 검증

- [ ] `npm test` — 신규 4개 케이스 Green
- [ ] `npm run build` — TypeScript strict 통과
- [ ] 기존 테스트 회귀 없음
