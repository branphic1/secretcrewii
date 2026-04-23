# Time Ledger — Claude 작업 가이드

> 이 파일은 Claude가 매 요청마다 먼저 읽는 프로젝트 컨텍스트다.
> 작업 전 반드시 이 문서와 `docs/SPEC.md`를 확인할 것.

---

## 🎯 프로젝트 정체성

**Time Ledger(시간의 궤적)**는 이커머스 팀장 1인을 위한 개인 업무 관리 웹앱이다.

- **사용자**: 몽브 (아이노즈·몽쿨 운영자, 다중 브랜드/엔티티 관리)
- **대체 대상**: 노션 기반 업무 관리 (입력 마찰이 높아 실패)
- **핵심 철학**:
  1. **3초 입력 원칙** — 모든 기록은 클릭 3회, 3초 이내 완료
  2. **구조 강요 최소화** — 사용자가 "어디에 입력할지" 고민하지 않게
  3. **시각 우위** — 숫자보다 패턴, 표보다 히트맵
  4. **층위별 시간 스케일** — 일간 / 월간 / 연간 / 블라인드스팟

상세 기능 명세는 항상 **`docs/SPEC.md`**를 참조한다.

---

## 📐 작업 규칙

### 항상 지킬 것
- 새 기능 구현 전 반드시 `docs/SPEC.md`의 해당 섹션을 먼저 읽고 시작
- 구현 결정 사항(라이브러리 선택, 구조 변경, 스키마 수정 등)은 `docs/DECISIONS.md`에 날짜와 근거를 함께 추가
- 티켓 단위로 작업 (한 번에 하나의 기능만)
- 작업 완료 시 반드시 다음 3가지를 요약:
  1. 변경·추가된 파일 목록
  2. 브라우저에서 테스트하는 방법
  3. 다음 티켓 제안

### 코드 스타일
- 모든 저장소 접근은 **반드시** `src/lib/storage.js` 경유 (`localStorage` 직접 호출 금지)
- 색상은 **inline style**로 처리 (Tailwind arbitrary value 지양)
- 파괴적 액션(삭제·초기화)은 `window.confirm` 다이얼로그 필수
- 입력 필드는 `Enter` 키 제출 지원
- 호버 시에만 삭제 아이콘 노출 (미관 + 실수 방지)

### 커밋 규칙
- 한 커밋에 2개 이상 기능 섞지 말 것
- 커밋 메시지 형식: `[T##] 기능 요약 (한국어 OK)`
  - 예: `[T05] 연간 목표 CRUD 구현`
- 티켓이 완료되면 `git tag`로 마일스톤 표시

---

## 🎨 디자인 언어

- **컨셉**: Editorial Minimalism (일기장 + 매거진 느낌)
- **베이스 컬러**: `#FAF8F3` (warm neutral)
- **텍스트**: `#1C1917` (stone-900 계열)
- **보더**: `#E7E5E0`, `#D6D3D1`, `#F0EEE8` (계층별)
- **폰트**:
  - 국문: Pretendard Variable (CDN: jsdelivr orioncactus)
  - 영문/숫자 디스플레이: Fraunces (Google Fonts, italic 활용)
- **카테고리 컬러 팔레트** (기본 10종, 사용자 수정 가능):
  ```
  인증·컴플라이언스  #C85450
  상세기획          #D4883F
  마케팅·콘텐츠     #5C8A6E
  AI·자동화 학습    #4A6FA5
  CS·고객대응       #8B6BA8
  상품개발·소싱     #7A5545
  운영·재무         #2C4A52
  채용·HR           #A6625A
  전략·기획         #6B6B4C
  기타              #8A8A8A
  ```

### 절대 금지
- 보라색 그라디언트 (AI slop 대표 사례)
- Inter, Roboto, 시스템 기본 폰트
- 과도한 그림자, 네온, 홀로그램 효과
- 카테고리 식별 외 목적의 무지개 컬러 남발

---

## 🏗 기술 스택

| 영역 | 선택 | 비고 |
|---|---|---|
| 빌드 | Vite | React + SWC 템플릿 |
| 프레임워크 | React 18 (JSX) | 함수형 컴포넌트 + Hooks |
| 스타일 | Tailwind CSS (core utility만) | + inline style 병행 |
| 차트 | Recharts | 파이/라인/바 |
| 아이콘 | lucide-react | 라인 아이콘 통일 |
| 저장소 | localStorage (v1) | wrapper 경유, 추후 IndexedDB 마이그레이션 고려 |
| 날짜 처리 | 네이티브 Date | dayjs/date-fns 불필요, 복잡해지면 재검토 |

**신규 라이브러리 추가 시**: 반드시 `docs/DECISIONS.md`에 선택 이유 기록.

---

## 📂 프로젝트 구조

```
time-ledger/
├── CLAUDE.md                 # 이 파일
├── docs/
│   ├── SPEC.md               # 작업 명세서 (single source of truth)
│   ├── DECISIONS.md          # 구현 결정 로그
│   └── prototype.jsx         # v1.0 프로토타입 참고용 (복사 금지, 참고만)
├── src/
│   ├── App.jsx               # 루트 + 탭 라우팅
│   ├── main.jsx
│   ├── index.css             # 폰트 import, 글로벌 스타일
│   ├── components/
│   │   ├── common/           # Header, TabBar, StatCard, CategoryPicker
│   │   ├── today/            # TodayView, PlanSection, LogSection
│   │   ├── monthly/          # MonthlyView, Heatmap, CategoryPie
│   │   ├── yearly/           # YearlyView, Goals, QuarterThemes, YearlyHeatmap
│   │   ├── blindspots/       # BlindSpotsView, Upcoming, Archive, Calendar
│   │   └── settings/         # SettingsView, CategoryEditor, DataIO
│   └── lib/
│       ├── storage.js        # 저장소 wrapper (load/save/remove)
│       ├── categories.js     # 기본 카테고리 + 블라인드스팟 템플릿
│       ├── dates.js          # 날짜 유틸 (pad, toDateStr, daysInMonth 등)
│       └── recurrence.js     # 주기형 블라인드스팟 롤오버 로직
├── package.json
└── vite.config.js
```

---

## 🎫 티켓 진행 현황

Phase 2 (v1.1) 티켓 목록:

- [x] T01 Vite + React 초기 세팅, 폰트/컬러 시스템
- [x] T02 prototype.jsx를 components 폴더로 모듈 분해
- [x] T03 lib/storage.js 공통 wrapper 작성
- [x] T04 연간 탭 라우팅 + 연도 네비게이션 플레이스홀더
- [x] T05 연간 목표 CRUD
- [x] T06 분기 테마 + 프로젝트 체크리스트
- [x] T07 연간 히트맵 (12개월 × 31일)
- [x] T08 카테고리별 연간 트렌드 라인차트
- [x] T09 블라인드 스팟 데이터 모델 + storage
- [x] T10 블라인드 스팟 탭 + 3개 섹션 레이아웃
- [x] T11 블라인드 스팟 CRUD (3유형)
- [x] T12 이커머스 기본 템플릿 로드
- [x] T13 주기형 롤오버 로직
- [x] T14 블라인드 스팟 캘린더 뷰
- [x] T15 임박 항목 배지/알림
- [x] T16 설정 확장 (JSON import/export, 블라인드스팟 카테고리)

**작업 완료 시 위 체크박스를 직접 `[x]`로 갱신할 것.**

---

## 🤖 Claude에게 기대하는 작업 흐름

사용자가 `"T05 진행해줘"`라고 요청하면:

1. `docs/SPEC.md`의 관련 섹션 읽기 (T05의 경우 3.3-A, 4.2 YearlyPlan 스키마)
2. `docs/DECISIONS.md`에 관련 과거 결정 있는지 확인
3. 구현 계획 3~5줄로 요약 후 사용자에게 확인 (큰 구조 변경일 때만)
4. 코드 작성 (기존 디자인 언어·구조 준수)
5. 변경 사항 요약: 파일 목록 + 테스트 방법 + 다음 티켓 제안
6. 주요 결정이 있었다면 `docs/DECISIONS.md`에 추가

### 막혔을 때
- SPEC.md가 모호하면 **임의로 결정하지 말고** 사용자에게 질문
- 라이브러리 추가가 필요하면 선택지 2~3개를 근거와 함께 제시
- 기존 코드를 대폭 리팩토링해야 할 것 같으면 먼저 사용자에게 승인 요청

---

## 🚫 금지 사항 요약

- `localStorage` 직접 호출 (반드시 `storage.js` 경유)
- 보라 그라디언트, Inter, Roboto, AI 클리셰 디자인
- 한 커밋에 여러 기능 섞기
- SPEC.md에 없는 기능을 "있으면 좋을 것 같아서" 임의로 추가
- 과거 데이터 구조 breaking change (호환성 유지 필수)
- 외부 API 호출 기능을 v1.x에 추가 (v1.3의 Claude API 연동은 별도 Phase)

---

## 📝 참고 파일 우선순위

1. **`CLAUDE.md`** (이 파일) — 항상 최우선
2. **`docs/SPEC.md`** — 기능 명세의 단일 진실 공급원
3. **`docs/DECISIONS.md`** — 과거 결정의 이유
4. **`docs/prototype.jsx`** — v1.0 참고용, 구조 참고만 (복사 금지)

충돌 시 위 순서가 우선한다. `SPEC.md`가 업데이트되면 `CLAUDE.md`와의 정합성을 확인한다.
