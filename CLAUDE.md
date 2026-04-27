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
- `ANTHROPIC_API_KEY` — `/api/generate-cafe` 가 API 모드로 호출할 때 사용
- `BACKEND_MODE` — `api` (기본, Vercel 배포에서 사용) | `local-cli` (맥미니 로컬에서 Claude Code CLI 호출, Max 인증 사용)
- `CLAUDE_CODE_BIN` — `claude` 가 PATH 에 없을 때만 지정 (예: `/usr/local/bin/claude`)

로컬은 `.env.local`, 배포는 Vercel 대시보드에 동일하게 등록 (Production/Preview/Development 체크).
맥미니에서 무한 생성 모드로 돌리는 셋업은 `docs/mac-mini-setup.md` 참고.

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

# 제품 템플릿 (/admin/templates, /cafe-writer)

`product_templates` 테이블에 제품별 **컨텐츠 가이드 + 지침 + 예시원고 세트** 를 저장해두고, 크루들이 `/cafe-writer` 에서 버튼 한 번으로 불러오는 기능.

- **컬럼**: `name`, `content_guide` (선택), `guideline`, `example` (선택), `created_by`, `created_at`, `updated_at`
- **관리자**: `/admin/templates` 에서 CRUD. 입력칸은 `.txt`/`.docx` 파일 첨부 + 드래그&드롭 (여러 파일 동시 → `---` 구분자로 자동 병합).
- **크루(approved)**: 
  - 상단 "🎯 제품 빠른 적용" 칩바 (admin 한정 "+ 새 템플릿" 링크 표시)
  - 각 원고 행 상단 "📚 제품 템플릿 불러오기" 버튼 → 모달에서 제품 선택 → 컨텐츠 가이드+지침+예시 자동 채움
- **무한 생성**: 행마다 "× N개" 입력으로 1~500회 반복 생성 (자동으로 행 복제 후 순차 처리)
- **엑셀 다운로드**: 툴바 `📊 엑셀 다운로드` → 성공 행 전체를 `.xlsx` 로 추출
- 관리자가 마스터 수정하면 다음 불러오기부터 자동 반영
- RLS: 승인된 유저 SELECT 가능, INSERT/UPDATE/DELETE 는 admin 만

# Electron 데스크톱 앱 빌드

직원에게 .exe 형태로 배포할 수 있어요. Max OAuth 모드로 동작 (각자 자기 Max 사용).

```bash
# 빌드 (Windows .exe)
npm run electron:dist:win
# 결과: dist/Cafe Writer Setup 0.1.0.exe (~146MB)

# Mac DMG (Mac 에서만 빌드 가능)
npm run electron:dist
```

- 진입점: `electron/main.js` — Next.js standalone 서버를 spawn 하고 BrowserWindow 띄움
- 정적 자산 복사: `scripts/copy_standalone_assets.mjs` (build:next 후 자동)
- 환경변수: `.env.production` 에서 NEXT_PUBLIC_SUPABASE_* + BACKEND_MODE=local-cli 만 포함 (서비스롤은 절대 포함 금지)
- 직원용 설치 가이드: `docs/employee-setup.md`

빌드 전 주의:
- `ELECTRON_RUN_AS_NODE` 환경변수가 설정돼있으면 안 됨 (Node 모드로 떨어짐)
  → 해제: `[Environment]::SetEnvironmentVariable("ELECTRON_RUN_AS_NODE", $null, "User")`

# 알려진 이슈

- Windows에서 webpack 캐시 경로 대소문자 경고(`c:\` vs `C:\`) 뜨는데 빌드엔 영향 없음
- `vercel build --prebuilt --prod`로 pre-built 배포 시, `NEXT_PUBLIC_*`는 빌드 타임 인라인이므로 `vercel pull`로 env 먼저 받아둬야 함
