# Implementation Plan

## 개요
claude-usage-monitor MVP 구현 계획
6~20개 Claude.ai 계정의 사용량/만료일 자동 수집 + 대시보드 + Google Chat 알람

## 전제 조건
- [ ] Node.js 20+ 설치 확인
- [ ] Supabase 또는 Neon 프로젝트 생성 + DATABASE_URL 확보
- [ ] Google Chat Webhook URL 확보
- [ ] Vercel 계정 + CLI 설치 (`npm i -g vercel`)
- [ ] 환경변수 준비 (`.env.local`)

```env
DATABASE_URL=
COOKIE_ENCRYPTION_KEY=   # openssl rand -hex 32
GOOGLE_CHAT_WEBHOOK_URL=
CRON_SECRET=             # openssl rand -hex 16
```

---

## Phase 1: 프로젝트 기반 구조 (Day 1)

### 1-1. Next.js 프로젝트 초기화
- [ ] `npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*"`
- [ ] shadcn/ui 초기화 (`npx shadcn@latest init`)
- [ ] Recharts 설치 (`npm install recharts`)
- [ ] Jest + Testing Library 설치

```bash
npm install -D jest @types/jest jest-environment-jsdom ts-jest
npm install -D @testing-library/react @testing-library/jest-dom
```

### 1-2. Prisma + DB 연결
- [ ] Prisma 설치 및 초기화

```bash
npm install prisma @prisma/client
npx prisma init
```

- [ ] `prisma/schema.prisma` 작성 (Account, UsageLog, AlertLog 모델)
- [ ] 첫 마이그레이션 실행: `npx prisma migrate dev --name init`
- [ ] Prisma Client 생성: `npx prisma generate`

### 1-3. 프로젝트 구조 설정
```
src/
├── app/
│   ├── page.tsx                    # 대시보드 (리다이렉트 → /dashboard)
│   ├── dashboard/page.tsx          # 메인 대시보드
│   ├── accounts/page.tsx           # 계정 관리
│   └── api/
│       ├── cron/collect/route.ts   # Vercel Cron 엔드포인트
│       ├── accounts/route.ts       # 계정 CRUD
│       ├── accounts/[id]/route.ts
│       └── usage/route.ts          # 사용량 조회
├── lib/
│   ├── prisma.ts                   # Prisma Client 싱글톤
│   ├── crypto.ts                   # AES-256-GCM 암호화
│   ├── claude-api.ts               # claude.ai API 클라이언트
│   ├── prediction.ts               # 초과 예측 로직
│   └── alert.ts                    # Google Chat 알람
├── components/
│   ├── dashboard/
│   │   ├── AccountCard.tsx
│   │   ├── UsageChart.tsx
│   │   └── AlertBadge.tsx
│   └── accounts/
│       ├── AccountForm.tsx
│       └── CookieInput.tsx
└── __tests__/
    ├── lib/crypto.test.ts
    ├── lib/prediction.test.ts
    ├── lib/claude-api.test.ts
    └── api/cron.test.ts
```

### 1-4. Vercel Cron 설정
- [ ] `vercel.json` 작성

```json
{
  "crons": [
    {
      "path": "/api/cron/collect",
      "schedule": "0 */5 * * *"
    }
  ]
}
```

---

## Phase 2: 핵심 비즈니스 로직 (Day 2) — TDD 필수

> **TDD 순서 엄수**: 테스트 먼저 → Red 확인 → 최소 구현 → Green → Refactor

### 2-1. 암호화 모듈 (TDD)
- [ ] **[Red]** `__tests__/lib/crypto.test.ts` 작성
  - encrypt → decrypt 왕복 테스트
  - 동일 입력 → 다른 암호문 (IV 랜덤성)
  - 변조된 암호문 → 에러 throw
- [ ] **[Green]** `src/lib/crypto.ts` 구현 (AES-256-GCM)
- [ ] **[Refactor]** 코드 정리

### 2-2. 초과 예측 로직 (TDD)
- [ ] **[Red]** `__tests__/lib/prediction.test.ts` 작성
  - 정상 케이스: 사용량 증가 추세 → 초과 시점 계산
  - 데이터 부족 케이스 (로그 1개) → false 반환
  - 사용량 없음 → 초과 없음
  - 5h 내 초과 / 7day 내 초과 경계값 테스트
- [ ] **[Green]** `src/lib/prediction.ts` 구현
- [ ] **[Refactor]** 엣지케이스 처리

### 2-3. claude.ai API 클라이언트 (TDD)
- [ ] **[Red]** `__tests__/lib/claude-api.test.ts` 작성
  - fetch 모킹으로 정상 응답 파싱 테스트
  - 401/403 → CookieExpiredError throw
  - 네트워크 오류 → FetchError throw
  - 응답 필드 파싱 (usedTokens, totalTokens, expiresAt)
- [ ] **[Green]** `src/lib/claude-api.ts` 구현
  - 쿠키 복호화 → fetch → 응답 파싱
- [ ] **[Refactor]** 에러 클래스 정리

### 2-4. Google Chat 알람 모듈
- [ ] `src/lib/alert.ts` 구현
  - `sendAlert(type, accountName, details)` 함수
  - 알람 타입: `EXPIRY_SOON` / `EXCEED_5H` / `EXCEED_7D` / `FETCH_ERROR`
  - AlertLog DB 저장 포함

---

## Phase 3: API Routes 구현 (Day 3) — TDD 병행

### 3-1. Cron Collect API (TDD)
- [ ] **[Red]** `__tests__/api/cron.test.ts` 작성
  - `CRON_SECRET` 미일치 → 401
  - 활성 계정 0개 → `{ collected: 0 }`
  - 계정 조회 성공 → UsageLog 저장 확인
  - 계정 조회 실패 → AlertLog 저장 + 에러 수집
- [ ] **[Green]** `src/app/api/cron/collect/route.ts` 구현

```ts
// 핵심 플로우
export async function POST(req: Request) {
  // 1. CRON_SECRET 검증
  // 2. 활성 계정 목록 조회
  // 3. Promise.allSettled로 병렬 수집
  // 4. 각 계정: 쿠키 복호화 → API 조회 → 파싱 → 예측 계산 → DB 저장
  // 5. 임계치 초과 → Google Chat 알람
  // 6. 결과 요약 반환
}
```

### 3-2. 계정 관리 API
- [ ] `GET /api/accounts` — 계정 목록 (쿠키 마스킹)
- [ ] `POST /api/accounts` — 계정 추가 (쿠키 암호화 저장)
- [ ] `PUT /api/accounts/[id]` — 계정 수정 (쿠키 갱신 포함)
- [ ] `DELETE /api/accounts/[id]` — 계정 삭제

### 3-3. 사용량 조회 API
- [ ] `GET /api/usage/latest` — 전체 계정 최신 스냅샷
- [ ] `GET /api/usage?accountId=&from=&to=` — 히스토리
- [ ] `GET /api/usage/prediction` — 위험 계정 목록

---

## Phase 4: 대시보드 UI (Day 4-5)

### 4-1. 메인 대시보드 (`/dashboard`)
- [ ] **전체 현황 카드** (Server Component)
  - 총 계정 수 / 위험 계정 수 / 만료 임박 수
- [ ] **계정별 상태 카드** (AccountCard)
  - 계정명 / 사용량 % / 만료일 / 예측 배지
  - 상태: 🟢 정상 / 🟡 주의 / 🔴 위험 / ⚫ 오류
- [ ] **사용량 추세 차트** (UsageChart — Recharts LineChart)
  - 계정 선택 → 최근 30일 사용량 시계열

### 4-2. 계정 관리 (`/accounts`)
- [ ] **계정 목록 테이블**
  - 이름 / orgId / 마지막 수집 시간 / 상태 / 액션
- [ ] **계정 추가/수정 폼** (AccountForm)
  - 계정명 입력
  - orgId 입력
  - 쿠키 JSON 붙여넣기 (CookieInput)
  - 즉시 테스트 버튼 ("연결 확인")
- [ ] **쿠키 추출 가이드** 모달
  - 콘솔 스크립트 표시 + 복사 버튼

---

## Phase 5: 브라우저 콘솔 쿠키 추출 스크립트 (Day 5)

- [ ] `scripts/extract-cookies.js` 작성 (브라우저 콘솔 실행용)

```js
// claude.ai에서 F12 → Console에 붙여넣고 실행
(function() {
  const needed = ['sessionKey', 'anthropic-device-id',
                  'lastActiveOrg', 'activitySessionId']
  const result = {}
  document.cookie.split(';').forEach(c => {
    const [k, ...v] = c.trim().split('=')
    if (needed.includes(k)) result[k] = v.join('=')
  })
  // orgId는 URL에서 추출
  const orgMatch = location.href.match(/organizations\/([^/]+)/)
  if (orgMatch) result._orgId = orgMatch[1]
  console.log(JSON.stringify(result, null, 2))
  copy(JSON.stringify(result))
  console.log('✅ 클립보드에 복사 완료! 대시보드에 붙여넣기 하세요.')
})()
```

---

## Phase 6: QA + 배포 (Day 6-7)

### 6-1. 전체 테스트
- [ ] `npm test -- --coverage` 실행
- [ ] 비즈니스 로직 커버리지 100% 확인 (crypto, prediction, claude-api)
- [ ] API Routes 커버리지 90%+ 확인

### 6-2. 실제 데이터 연동 확인
- [ ] 실제 claude.ai 계정 1개로 API 조회 테스트
- [ ] API 응답 필드 확인 (만료일 필드명, 사용량 필드명)
- [ ] `rawResponse` 저장 확인 → 파싱 로직 조정

### 6-3. Vercel 배포
- [ ] Vercel 프로젝트 연결: `vercel link`
- [ ] 환경변수 설정: `vercel env add`
- [ ] 첫 배포: `vercel --prod`
- [ ] Cron 동작 확인 (Vercel 대시보드 → Functions → Cron)
- [ ] Google Chat 알람 테스트 전송

### 6-4. 보안 점검
- [ ] DB에 쿠키 평문 저장 없음 확인
- [ ] 환경변수 노출 없음 확인 (`git log` 검토)
- [ ] Cron Secret 미설정 시 401 반환 확인

---

## 위험 요소

| 위험 | 가능성 | 대응책 |
|------|--------|--------|
| claude.ai API 응답 스키마 미확인 | 높음 | rawResponse JSON 전체 저장 → 파싱 로직 분리 |
| 세션 쿠키 유효기간 짧음 | 중간 | API 실패 시 즉시 Google Chat 알람 + 쿠키 갱신 가이드 |
| Vercel Free Cron 제한 | 중간 | Pro 플랜 업그레이드 (5시간 = 월 ~144회) |
| 병렬 fetch로 claude.ai 차단 | 낮음 | `Promise.allSettled` + 계정 간 딜레이 (500ms) |

---

## 파일 변경 이력

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-04-10 | 초기 MVP 계획 작성 |

---

**이 계획에 동의하시면 "진행" 또는 "OK"를 입력해주세요.**
**수정이 필요하면 구체적으로 말씀해주세요.**
