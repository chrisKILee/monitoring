# SPEC: 사용자 관리 & 서비스 계정 관리

## 1. 목적

Confluence 표1·표2를 이 서비스로 완전히 대체한다.
모든 사용자·계정 정보를 DB에서 CRUD하고, Google Chat 만료 알림을 자동화한다.

---

## 2. 데이터 모델

### 2-1. ServiceAccount (표1 — 계정 관리)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | String (cuid) | PK |
| accountName | String (unique) | 계정 식별자 |
| service | String | `claude` \| `codex` |
| phoneAuth | String? | 전화 인증 담당자 |
| isShared | String? | `Y` \| `N` \| null |
| note | String? | 비고 |
| members | Member[] | 이 계정을 사용하는 멤버 |
| createdAt / updatedAt | DateTime | |

### 2-2. Member (표2 — 사용자 관리)

| 필드 | 타입 | 변경 |
|------|------|------|
| id | String (cuid) | PK |
| name | String | 이름 |
| purpose | String? | 목적 |
| startDate | DateTime? | 시작일 |
| endDate | DateTime? | 종료일 |
| serviceAccountId | String? | FK → ServiceAccount (신규, 기존 accountId 대체) |
| serviceAccount | ServiceAccount? | relation |
| createdAt / updatedAt | DateTime | |

> ⚠️ 기존 `accountId → Account` 관계 제거. 모니터링용 Account와 사용자 관리는 분리.

---

## 3. 페이지 구성

### 3-1. `/members` — 사용자 관리

- 테이블 뷰 (이름 / 목적 / 시작일 / 종료일 / 사용 계정)
- 행 클릭 → 인라인 편집 (모든 필드)
- [+ 사용자 추가] 버튼 → 다이얼로그
- 사용 계정 셀: ServiceAccount 드롭다운 선택
- 종료일 D-5 / D-3 / D-0 뱃지 표시

### 3-2. `/service-accounts` — 계정 관리

- 테이블 뷰 (계정명 / 서비스 / 전화인증 / 공유계정 / 비고)
- 행 클릭 → 인라인 편집 (모든 필드)
- [+ 계정 추가] 버튼 → 다이얼로그
- 계정 행 확장(expand) → 해당 계정 사용자 목록 표시

### 3-3. Nav 변경

기존: 대시보드 / 계정 관리
변경: 대시보드 / 사용자 관리 / 계정 관리 / 모니터링 계정

---

## 4. API 설계

### Members
| Method | Path | 동작 |
|--------|------|------|
| GET | `/api/members` | 전체 목록 (serviceAccount 포함) |
| POST | `/api/members` | 생성 |
| PATCH | `/api/members/[id]` | 수정 |
| DELETE | `/api/members/[id]` | 삭제 |

### ServiceAccounts
| Method | Path | 동작 |
|--------|------|------|
| GET | `/api/service-accounts` | 전체 목록 (members 포함) |
| POST | `/api/service-accounts` | 생성 |
| PATCH | `/api/service-accounts/[id]` | 수정 |
| DELETE | `/api/service-accounts/[id]` | 삭제 |

---

## 5. Google Chat 알림 — 사용자 종료일

### 발송 시점
- D-5: 종료 5일 전 09:00
- D-3: 종료 3일 전 09:00
- D-0: 종료 당일 09:00

### Cron
- `GET /api/cron/member-expiry` (Vercel Cron, 매일 09:00 KST = 00:00 UTC)
- `vercel.json` cron schedule: `"0 0 * * *"`

### 메시지 포맷
```
🔔 [AI 계정 만료 예정]
*이름*: 홍길동
*계정*: vntg_ai_license_06
*목적*: SeAH Wind ERP 개발
*종료일*: 2026.05.31 (D-5)
```

### 중복 발송 방지
- `AlertLog` 테이블 활용: `alertType = MEMBER_EXPIRY_D5 | MEMBER_EXPIRY_D3 | MEMBER_EXPIRY_D0`
- 당일 동일 memberId + alertType이 존재하면 스킵

---

## 6. 테스트 케이스

### 6-1. API 유닛 테스트

**Members**
- `GET /api/members` → 200, 배열 반환
- `POST /api/members` 정상 → 201, 생성된 객체
- `POST /api/members` 이름 누락 → 400
- `PATCH /api/members/[id]` 정상 → 200, 수정된 객체
- `PATCH /api/members/[존재않는id]` → 404
- `DELETE /api/members/[id]` → 200

**ServiceAccounts**
- `GET /api/service-accounts` → 200, members 포함
- `POST /api/service-accounts` accountName 중복 → 409
- `PATCH /api/service-accounts/[id]` → 200

### 6-2. Cron 알림 테스트

- D-5 대상 멤버 존재 → Google Chat 호출 1회, AlertLog 생성
- D-5 이미 AlertLog 존재 → 스킵 (중복 방지)
- endDate null 멤버 → 스킵
- D-5 / D-3 / D-0 복합 → 각각 독립 발송

### 6-3. UI 동작 (E2E 시나리오)
- 사용자 추가 → 목록 갱신
- 사용자 편집 → 저장 후 변경사항 반영
- 계정 삭제 → 연결된 멤버의 serviceAccountId null 처리

---

## 7. 구현 순서 (TDD)

```
① DB 마이그레이션 (Member 스키마 변경 + ServiceAccount members 관계)
② API 테스트 작성 → Red
③ API 구현 → Green
④ Cron 테스트 작성 → Red
⑤ Cron 구현 → Green
⑥ UI 컴포넌트 구현 (members page, service-accounts page)
⑦ Nav 업데이트
```

---

## 8. 완료 기준 (DoD)

- [ ] Member CRUD API 동작
- [ ] ServiceAccount CRUD API 동작
- [ ] `/members` 페이지: 인라인 편집, 추가, 삭제
- [ ] `/service-accounts` 페이지: 인라인 편집, 추가, 삭제, 멤버 확장 보기
- [ ] Cron D-5/D-3/D-0 알림 발송 및 중복 방지
- [ ] 전체 테스트 통과
- [ ] Nav에 사용자 관리 / 계정 관리 링크 추가
