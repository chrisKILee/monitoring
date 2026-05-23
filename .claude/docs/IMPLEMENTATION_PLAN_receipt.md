# IMPL_PLAN — Receipt (청구서) 메뉴

> 작성: 2026-05-23  
> 요구사항: `/mnt/c/Users/CHRIS LEE/Documents/chris-obsidian/Projects/monitoring/요구사항/receipt.md`

## 목표

Claude / Codex 계정의 월별 청구서를 한 화면에서 조회하는 `/receipt` 페이지를 추가한다.

---

## 외부 API 명세

### Claude
- **인보이스**: `GET https://claude.ai/api/stripe/{orgId}/invoices?limit=12&page=`
  - 인증: `encryptedCookies` (이미 DB에 있음)
  - 응답: Array of invoice objects
- **구독 상세**: `GET https://claude.ai/api/organizations/{orgId}/subscription_details`
  - 응답: `{ next_charge_date, ... }`

### Codex
- **인보이스**: `GET https://chatgpt.com/backend-api/invoices?limit=12&account_id={chatgpt_account_id}`
  - 인증: `encryptedToken` (Bearer JWT)
  - `chatgpt_account_id`: JWT payload의 `https://api.openai.com/auth.chatgpt_account_id`
- **결제 수단**: `GET https://chatgpt.com/backend-api/payments/payment_methods?account_id={chatgpt_account_id}`
  - 응답: `{ payment_methods: [{ last4, ... }] }`

---

## 표시 컬럼

| 컬럼 | Claude 출처 | Codex 출처 |
|------|------------|------------|
| AI 도구 | `aiTool` | `aiTool` |
| email | `Account.name` | JWT payload email |
| 별칭 | `Account.alias` | `Account.alias` |
| 결제일 | invoice `created` (Unix ts) | invoice `created` / `period_end` |
| 결제금액 | `total_excluding_tax` + `currency` | `total_excluding_tax` + `currency` |
| 상태 | `status` (paid/open 등) | `status` |
| 결제카드 | `payment_method.last4` | payment_methods[0].last4 |
| 빌링구분 | `billing_interval` (month/year) | `billing_interval` |
| 다음결제일 | subscription_details `next_charge_date` | invoice `next_payment_attempt` 또는 별도 |

---

## 구현 단계

### Phase 1 — DB 권한 필드 추가 (SQL 직접)
```sql
ALTER TABLE user_permission ADD COLUMN IF NOT EXISTS "receiptRead" BOOLEAN NOT NULL DEFAULT FALSE;
```
- `prisma/schema.prisma` `UserPermission` 모델에 `receiptRead Boolean @default(false)` 추가
- `npx prisma generate`

### Phase 2 — 유틸리티 함수 (`src/lib/receipt-api.ts`)
- `extractCodexAccountId(token: string): string | null`
  - JWT payload `https://api.openai.com/auth.chatgpt_account_id` 추출
- `fetchClaudeInvoices(orgId: string, cookies: string): Promise<ClaudeInvoice[]>`
- `fetchClaudeSubscription(orgId: string, cookies: string): Promise<{ next_charge_date?: string }>`
- `fetchCodexInvoices(token: string, accountId: string): Promise<CodexInvoice[]>`
- `fetchCodexPaymentMethods(token: string, accountId: string): Promise<{ last4?: string }>`

### Phase 3 — API Route (`GET /api/receipt?yyyymm=202501`)
- `src/app/api/receipt/route.ts`
- 인증: requirePermission(receiptRead)
- DB에서 활성 계정 전체 조회 (Claude + Codex)
- `yyyymm` 파라미터 기반 필터링 (해당 월 인보이스만)
- Claude: `Promise.allSettled` — orgId + cookies → invoices + subscription
- Codex: `Promise.allSettled` — token → accountId → invoices + payment_methods
- 응답: `ReceiptRow[]`

### Phase 4 — UI

#### `src/app/receipt/layout.tsx`
- `requirePermission(receiptRead)` 서버사이드 체크

#### `src/app/receipt/page.tsx`
- 서버 컴포넌트: 현재 YYYYMM 기본값으로 API 호출 → `<ReceiptTable>` 렌더링

#### `src/components/receipt/ReceiptTable.tsx`
- Client 컴포넌트 (YYYYMM 선택박스 → 데이터 재조회)
- YYYYMM 선택박스: 현재 월 기준 최근 12개월
- 테이블: email / 별칭 / 결제일 / 결제금액 / 상태 / 결제카드 / 빌링구분 / 다음결제일
- 도구 뱃지 (Claude/Codex)
- 로딩 상태, 에러 상태 처리

### Phase 5 — 권한 관리 UI 업데이트
- `src/components/admin/AdminUsersTable.tsx`
  - `receiptRead` 체크박스 컬럼 추가 ("청구서 R")
  - `UserPermission` 인터페이스에 `receiptRead` 추가
- `src/lib/auth-utils.ts`
  - `requirePermission` 콜백 타입에 `receiptRead` 추가

### Phase 6 — 네비게이션 추가
- 사이드바/네비에 "Receipt" 메뉴 추가
- 위치: 계정관리(accounts) 아래

---

## 파일 목록

| 파일 | 변경 |
|------|------|
| `prisma/schema.prisma` | `receiptRead` 추가 |
| `src/lib/receipt-api.ts` | NEW — 인보이스 fetch 유틸 |
| `src/app/api/receipt/route.ts` | NEW — GET /api/receipt |
| `src/app/receipt/layout.tsx` | NEW — 권한 체크 |
| `src/app/receipt/page.tsx` | NEW — 서버 페이지 |
| `src/components/receipt/ReceiptTable.tsx` | NEW — 클라이언트 테이블 |
| `src/components/admin/AdminUsersTable.tsx` | receiptRead 컬럼 추가 |
| `src/lib/auth-utils.ts` | receiptRead 타입 추가 |
| `src/components/ui/nav*.tsx` 또는 `layout.tsx` | receipt 메뉴 추가 |

---

## 주의사항

- Claude/Codex 외부 API 호출은 서버사이드(API Route)에서만 수행 (쿠키/토큰 노출 방지)
- API 응답 구조는 실제 호출 결과를 보고 조정 필요 (추정 기반 구현)
- 쿠키/토큰 만료 시 해당 계정은 에러로 표시, 나머지는 정상 표시
- `total_excluding_tax`는 센트 단위일 수 있음 (currency 기반 자동 처리)
- DB push 대신 SQL 직접 실행 (Member_pkey 충돌 이슈)
