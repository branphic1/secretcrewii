# 🚀 secretcrewii

> 시크릿크루 바이브코딩 프로젝트

**Live**: https://secretcrewii.vercel.app

## Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS
- **Auth/DB**: Supabase (@supabase/ssr)
- **Hosting**: Vercel (main 푸시 시 자동 배포)

## Getting Started

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 세팅
cp .env.example .env.local
# .env.local 에 Supabase 키 채우기

# 3. 개발 서버 실행
npm run dev
# → http://localhost:3000
```

## Environment Variables

| Key | Scope | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | Server Action / API Route 전용 |

## Scripts

- `npm run dev` — 로컬 개발 서버
- `npm run build` — 프로덕션 빌드
- `npm run start` — 프로덕션 서버 실행
- `npm run lint` — ESLint 검사

## Deploy

`main` 브랜치에 푸시하면 Vercel이 자동으로 빌드 + 배포합니다.
수동 배포는 `vercel --prod --yes`.

## Progress

- [x] **Day 1** — 랜딩 페이지 + Supabase 연결 스모크 테스트
- [ ] Day 2 —

---

Co-built with [Claude Code](https://claude.com/claude-code).
