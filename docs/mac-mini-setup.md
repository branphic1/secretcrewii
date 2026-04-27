# Mac mini 로컬 백엔드 셋업

도현님 Mac mini 에서 Next.js 를 직접 실행하고, `/api/generate-cafe` 가
**Claude Max OAuth 인증된 `claude` CLI** 를 호출해서 글을 무한히 생성하도록 하는 방법.

> ⚠ 이 방식은 **본인 단일 사용자(맥미니 한 대) 기준** 입니다. 다른 사람이 이 맥미니의
> 웹 UI 에 접속해서 쓰면 한 Max 구독이 다중 호출을 받는 구조가 되어 ToS 회색지대.
> Vercel 배포 쪽은 그대로 API 모드 (`ANTHROPIC_API_KEY`) 로 돌고, 이 로컬 모드는
> 맥미니에서만 쓰세요.

## 1. Claude Code CLI 설치 + 로그인 (한 번만)

맥미니 터미널에서:

```bash
# Homebrew 로 설치 (없으면 https://brew.sh 먼저)
brew install anthropic/claude/claude

# 또는 npm 글로벌 설치
npm i -g @anthropic-ai/claude-code

# Max 계정으로 로그인 (브라우저 열림)
claude login

# 잘 됐는지 테스트
echo "ping" | claude -p
```

`ping` 에 답이 돌아오면 OK.

## 2. 프로젝트 클론 + 의존성

```bash
cd ~/projects   # 원하는 위치
git clone https://github.com/branphic1/secretcrewii.git
cd secretcrewii
npm install
```

## 3. 환경변수 (`.env.local`)

```bash
cp .env.example .env.local
```

그다음 `.env.local` 을 편집해서 아래 값 채우기:

```
NEXT_PUBLIC_SUPABASE_URL=https://tqitheecvhjpwwftwvyh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Supabase 대시보드에서 복사>
SUPABASE_SERVICE_ROLE_KEY=<Supabase 대시보드에서 복사>

# 핵심: 이 모드를 켜면 Anthropic API 대신 로컬 claude CLI 호출
BACKEND_MODE=local-cli
```

`ANTHROPIC_API_KEY` 는 **있어도 되고 없어도 됨**. `BACKEND_MODE=local-cli` 면 무시되니까.

> Supabase 키 위치: https://supabase.com/dashboard → 프로젝트 → Settings → API → Project URL / anon key / service_role key

## 4. 실행

```bash
npm run dev
```

→ `http://localhost:3000/cafe-writer` 접속  
→ 평소처럼 가입/로그인 (이미 가입된 계정 그대로 사용 가능)  
→ 행 채우고 **▶ 이 행 생성** 누르면 → 맥미니의 `claude -p` 가 처리 → 결과 표시

API 키 없이 동작하면 성공.

## 5. 항상 켜두기 (선택)

### 5a. 백그라운드로 띄우기 (`nohup`)
```bash
cd ~/projects/secretcrewii
nohup npm run dev > dev.log 2>&1 &
disown
```

`tail -f dev.log` 로 로그 확인.

### 5b. 부팅 시 자동 시작 (`launchd`)

`~/Library/LaunchAgents/com.secretcrewii.dev.plist` 만들고:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.secretcrewii.dev</string>
  <key>WorkingDirectory</key>
  <string>/Users/도현유저명/projects/secretcrewii</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/npm</string>
    <string>run</string>
    <string>dev</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>/tmp/secretcrewii.out</string>
  <key>StandardErrorPath</key>
  <string>/tmp/secretcrewii.err</string>
</dict>
</plist>
```

활성화:
```bash
launchctl load ~/Library/LaunchAgents/com.secretcrewii.dev.plist
```

이러면 맥미니 부팅하면 자동으로 `npm run dev` 가 돌아가요.

## 6. 외부에서 접속하고 싶다면 (선택)

맥미니 외부에서도 같은 UI 쓰고 싶으면 Cloudflare Tunnel:

```bash
brew install cloudflared
cloudflared tunnel --url http://localhost:3000
```

발급되는 `https://xxxxxx.trycloudflare.com` 주소로 어디서든 접속 가능.
(맥미니가 켜져있는 동안만)

## 검증 체크리스트

- [ ] `claude --version` 정상 동작
- [ ] `echo ping | claude -p` 응답 옴
- [ ] `npm run dev` 에러 없이 시작
- [ ] http://localhost:3000/cafe-writer 로그인됨
- [ ] 행 생성 버튼 → 결과 옴 (응답에 `"mode":"local-cli"` 들어있음)
- [ ] Vercel 배포 쪽 (https://secretcrewii.vercel.app) 은 여전히 API 모드로 잘 됨

## 트러블슈팅

**Claude Code CLI 실행 실패: spawn claude ENOENT**
- `claude` 가 PATH 에 없음. `which claude` 로 경로 확인
- `.env.local` 에 `CLAUDE_CODE_BIN=/full/path/to/claude` 로 지정

**응답이 너무 느림 / 타임아웃**
- 기본 타임아웃 180초. 더 늘리려면 route.ts 의 `180_000` 값 수정

**Max 한도 초과**
- Claude Code 가 Max 일일/주간 한도 안내 메시지 출력 → CLI stderr 에 찍힘
- 그러면 잠시 대기하거나 평소처럼 API 모드로 폴백 (BACKEND_MODE 제거)
