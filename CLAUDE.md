# claude-usage-monitor - 프로젝트 헌법 (Constitution)

> 이 문서는 프로젝트의 모든 개발 관행에 우선합니다.
> 수정 시 프로젝트 관리자의 승인이 필요합니다.

## 프로젝트 개요
- **프로젝트명**: claude-usage-monitor
- **목적**: 6~20개의 Claude.ai 계정(기관 ID 단위)의 사용량과 만료일을 5시간 주기로 자동 수집하여, 만료 전 사전 경고 및 사용량 초과 예측을 제공하는 개인용 모니터링 대시보드
- **타겟 사용자**: 개인 (나 혼자)
- **MVP 범위**: API 조회 + PostgreSQL 저장 + 대시보드 시각화 + Google Chat 알람 전체 동시 배포

## 개발 원칙

### SDD (Spec-Driven Development) 워크플로우
요청이 들어오면 반드시 아래 순서를 따른다:

1. **요구사항 수집** - PRD/TRD/ADR/SPEC 문서 작성
   - **PRD 작성** (`/prd`) - 왜 만드는가
   - **TRD 작성** (`/trd`) - 어떻게 만드는가
   - **ADR 작성** (`/adr`) - 왜 이 기술을 선택했는가
   - **SPEC 작성** (`/spec`) - 무엇을 만드는가 (상세 인터뷰)
   - **구현 계획 작성** (`/impl-plan`) → 요청자 **컨펌 후 자율 실행 시작**
2. **테스트 케이스 작성** (요구사항 기반, 구현 전 먼저 작성) ← **TDD Red 단계**
3. **기능 구현** ← **자율 실행 구간 시작** (TDD Green → Refactor 사이클)
4. **테스트 검증** - 전체 테스트 통과 확인
5. **배포 전 확인** - Dogfood (`/dogfood`) + 보안 리뷰 (`/security-review`)
6. **배포** - 이상 없을 때 commit-push → Vercel 자동 배포

### 문서 위치
모든 SDD 문서는 `.claude/docs/` 에 저장한다:
- `.claude/docs/PRD.md`
- `.claude/docs/TRD.md`
- `.claude/docs/ADR.md`
- `.claude/docs/SPEC.md`
- `.claude/docs/IMPLEMENTATION_PLAN.md`

## Technology Stack

### 전체 아키텍처
- **단일 레포 (Next.js App Router)** — 프론트엔드 + API Routes 통합
- **배포**: Vercel (프론트 + API Routes + Cron Jobs)
- **DB**: 외부 PostgreSQL (Supabase 또는 Neon)
- **ORM**: Prisma

### Frontend
- **Framework**: Next.js 15 (App Router)
- **언어**: TypeScript (strict mode)
- **스타일**: Tailwind CSS + shadcn/ui
- **차트**: Recharts

### Backend (API Routes)
- **Framework**: Next.js App Router API Routes
- **언어**: TypeScript (strict mode)
- **스케줄러**: Vercel Cron Jobs (5시간 주기, `0 */5 * * *`)
- **HTTP Client**: fetch (내장)

### 환경
- **개발환경**: WSL2 on Windows
- **배포**: Vercel

## 핵심 비즈니스 로직

### 계정 모니터링 사이클
1. Vercel Cron이 5시간마다 `/api/cron/collect` 호출
2. DB에서 활성 계정 목록 + 세션 쿠키 로드
3. 각 계정의 `https://claude.ai/api/organizations/{orgId}/usage` 호출
4. 응답 파싱 → `usage_logs` 테이블에 저장
5. 만료일/사용량 초과 예측 계산
6. 임계치 초과 시 Google Chat Webhook 알람 발송

### 경고 조건
- 만료 7일 이내 → Google Chat 알람
- 현재 사용 속도로 5h 내 초과 예측 → 알람
- 현재 사용 속도로 7day 내 초과 예측 → 알람
- API 조회 실패 (쿠키 만료 등) → 알람

### 쿠키 관리 자동화
- 브라우저 콘솔 스크립트(`/scripts/extract-cookies.js`)를 실행하여 필요한 쿠키를 JSON으로 추출
- 추출한 쿠키를 관리 UI에서 붙여넣기로 업데이트
- DB에 암호화 저장 (AES-256-GCM)

## TDD 원칙 (필수)

> SDD 워크플로우 내에서 TDD는 필수 사이클입니다.

1. **Red** — 테스트 먼저 작성, 실패 확인
2. **Green** — 최소 구현으로 통과
3. **Refactor** — 코드 정리 (테스트 유지)

### 이 프로젝트 TDD 적용 범위
- **API Routes**: Jest + supertest 엔드포인트 단위 테스트
- **비즈니스 로직** (예측 계산, 암호화, 파싱): 순수 함수 단위 테스트 **100%**
- **Cron 로직**: 외부 API 모킹으로 격리 테스트
- **커버리지 목표**: 핵심 비즈니스 로직 90%+, 유틸리티 함수 100%
- **구현 코드 먼저 작성 금지** — 테스트 없는 구현은 PR 반려

## 코딩 스타일
- 항상 새 객체 생성, 절대 뮤테이션 금지
- TypeScript strict 모드 필수, `any` 타입 금지
- 함수 50줄 이하, 파일 800줄 이하
- `console.log` 커밋 금지, 하드코딩 값 금지
- 모든 비동기 작업은 에러 처리 필수

## 보안 원칙
- 세션 쿠키는 DB에 암호화 저장 (평문 금지)
- 환경변수로 암호화 키 관리 (`COOKIE_ENCRYPTION_KEY`)
- Google Chat Webhook URL은 환경변수 처리
- API Routes에 기본 인증 (CRON_SECRET 헤더 검증)

## 자율 실행 원칙

> impl-plan 컨펌 이후 아래 원칙을 적용한다:

- **작업 중 사용자에게 확인 요청 금지** — 컨펌 이후는 자율 진행
- **모호한 부분은 최선의 판단으로 결정 후 진행** — 판단 근거는 완료 보고에 포함
- **완료 후 요약 보고** — 구현 내용, 테스트 결과, 배포 상태를 한 번에 보고

자율 실행 구간: `테스트 작성 → 구현 → 테스트 검증 → 배포 확인 → 배포`

## Git 워크플로우
- 직접 main/master push 금지
- 브랜치 전략: `feature/기능명`, `fix/버그명`
- 커밋 형식: `[feat/fix/docs/refactor] 제목`
- PR 전 테스트 전체 통과 필수

## 환경변수 목록
```
DATABASE_URL=                    # PostgreSQL 연결 문자열
COOKIE_ENCRYPTION_KEY=           # 쿠키 AES 암호화 키
GOOGLE_CHAT_WEBHOOK_URL=         # Google Chat Webhook
CRON_SECRET=                     # Vercel Cron 인증 시크릿
```
