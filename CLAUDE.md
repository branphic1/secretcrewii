# 프로젝트 개요

- **이름**: secretcrewii
- **스택**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + Supabase (@supabase/ssr) + Vercel
- **목적**: 시크릿크루 바이브코딩 프로젝트. 현재 Day 1 (랜딩 페이지 + Supabase 연결 스모크 테스트)
- **라이브 URL**: https://secretcrewii.vercel.app
- **GitHub**: https://github.com/branphic1/secretcrewii

# 디렉토리 구조

- `src/app/` — Next.js App Router 페이지/레이아웃
- `src/lib/supabase/` — Supabase 클라이언트 (server.ts / client.ts 분리)
- `supabase/` — Supabase CLI 로컬 프로젝트 (config.toml, 마이그레이션 등)
- `public/` — 없음. 필요해지면 추가 (Next.js가 자동 서빙)

# 코딩 규칙

- TypeScript strict 모드
- Tailwind 유틸리티 우선 (커스텀 CSS는 globals.css에만)
- 서버 컴포넌트 기본, 클라이언트 컴포넌트는 `"use client"` 명시
- Supabase 클라이언트 사용처 구분:
  - 서버 컴포넌트/Server Action: `@/lib/supabase/server`
  - 클라이언트 컴포넌트: `@/lib/supabase/client`
- 새 UI 컴포넌트는 `src/components/` 에 추가 (디렉토리 없으면 생성)
- 경로 별칭: `@/*` → `src/*`

# 환경변수

- `NEXT_PUBLIC_SUPABASE_URL` — 클라/서버 공용
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — 클라/서버 공용
- `SUPABASE_SERVICE_ROLE_KEY` — **서버 전용** (Server Action / Route Handler)

로컬은 `.env.local`, 배포는 Vercel 대시보드에 동일하게 등록 (Production/Preview/Development 체크).

# 배포 / CI

- `git push origin main` → Vercel 자동 배포 (GitHub 웹훅 연결됨)
- `vercel.json`에 `{ "framework": "nextjs" }` 명시됨 — 삭제 금지 (Output Directory 감지 안 돼서 배포 실패한 적 있음)
- 수동 배포: `vercel --prod --yes`

# 금지 사항

- `SUPABASE_SERVICE_ROLE_KEY`를 클라이언트 컴포넌트/브라우저 노출 코드에서 사용 금지
- `.env.local` 커밋 금지 (.gitignore에 들어있음)
- `git push --force`, `git reset --hard origin/main` 같은 파괴적 명령은 유저 확인 후에만
- 일반 `git push origin main` 은 에이전트가 직접 실행 가능 (force-push/reset 은 여전히 금지)

# 자주 쓰는 명령

```bash
npm run dev              # 로컬 개발 서버
npm run build            # 빌드 검증
vercel env ls            # Vercel 환경변수 확인
vercel env pull .vercel/.env.production.local --environment=production
vercel inspect <url> --logs   # 배포 로그 조회
supabase db push         # 로컬 마이그레이션 원격 반영
```

# 크루 승인 방법 (/cafe-writer 접근 허용)

`/signup` 으로 가입한 유저는 기본 `approved=false` 상태라 막혀있음. 승인 방법 3가지:

### 방법 1: 웹 관리자 페이지 (권장)
관리자(`role=admin`) 계정으로 로그인 후 `/admin` 접속:
- 대기/승인된 유저 목록 표시
- ✅승인 / ↩취소 / 🗑삭제 / admin 지정 버튼
- 본인 계정은 실수 방지를 위해 삭제/해제 불가

### 방법 2: 스크립트 (터미널)
```bash
node scripts/approve_user.mjs 유저이메일@example.com
```

### 방법 3: Supabase 대시보드
Table Editor → `profiles` → `approved` 를 `true` 로 토글. (이메일 미인증이면 Authentication → Users 에서 별도 확인 필요)

### 관리자 지정 스크립트
```bash
node scripts/set_admin.mjs 유저이메일@example.com
```
role=admin 으로 설정. `/admin` 페이지에서도 동일 작업 가능.

### 기본 관리자
- `psw1860@naver.com` (role=admin, approved=true)

# 알려진 이슈

- Windows에서 webpack 캐시 경로 대소문자 경고(`c:\` vs `C:\`) 뜨는데 빌드엔 영향 없음
- `vercel build --prebuilt --prod`로 pre-built 배포 시, `NEXT_PUBLIC_*`는 빌드 타임 인라인이므로 `vercel pull`로 env 먼저 받아둬야 함
