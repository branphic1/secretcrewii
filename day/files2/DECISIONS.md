# Time Ledger — 구현 결정 로그

> 구현 중 내린 기술·디자인 결정을 날짜와 근거와 함께 기록한다.
> 새 결정이 과거 결정과 충돌하면 과거 항목을 "Superseded" 표기하고 새 항목 추가.

---

## 형식

```markdown
## YYYY-MM-DD — [제목]

**결정**: 무엇을 했는가
**배경**: 왜 고민했는가
**대안**: 검토한 다른 선택지
**근거**: 왜 이걸 선택했는가
**영향**: 어떤 파일/기능에 영향을 주는가
```

---

## 2026-04-23 — 저장소 선택 (localStorage v1)

**결정**: Phase 2까지는 `localStorage` 사용, wrapper(`src/lib/storage.js`) 경유 필수
**배경**: 프로토타입은 아티팩트 전용 `window.storage` 사용. Antigravity 로컬 개발/배포에 부적합
**대안**:
- IndexedDB: 용량은 크지만 API 복잡, 5MB 초과 전까진 오버엔지니어링
- Supabase/Firebase: v1 단계에서는 단일 기기 사용 전제라 불필요
**근거**: 단순성 + 즉시 동작 + 추후 wrapper만 교체하면 마이그레이션 가능
**영향**: `src/lib/storage.js`, 모든 저장/로드 호출부

---

## 2026-04-23 — 디자인 언어: Editorial Minimalism

**결정**: 따뜻한 뉴트럴 베이스(#FAF8F3) + Pretendard(KR) + Fraunces(EN/Num italic) 조합
**배경**: 일반적인 SaaS 대시보드 톤을 피하고 "개인 일기장" 같은 친밀감 추구
**대안**:
- 브루털리즘: 너무 강함, 일상 사용에 피로
- 네온/미래지향: AI slop 연상
- Apple 기본 시스템 톤: 개성 부족
**근거**: 매일 수 회 접속하는 도구이므로 피로하지 않으면서도 몽브님 개인 정체성 반영 필요
**영향**: 전체 컴포넌트 스타일, 폰트 import(`index.css`)

---

## (여기서부터 새 결정 추가)

---

## 2026-04-23 — 프로젝트 위치: c:/secretcrewii/time-ledger/

**결정**: 상위 Next.js 저장소(`c:/secretcrewii/`)의 서브디렉토리로 독립 Vite 앱 생성
**배경**: `c:/secretcrewii/`는 Next.js + Supabase 기반 랜딩(Day 1). Time Ledger는 Vite + React + localStorage 스택으로 스펙이 다름
**대안**:
- 기존 Next.js 앱에 통합: 스택 충돌, 저장 매체(Supabase)와 명세(localStorage) 불일치
- 완전 별도 레포: 몽브님이 한 지붕(secretcrewii) 아래 운영하는 개인 프로젝트 묶음이라 판단되어 과도
**근거**: 스펙 준수 + 상위 레포의 Git 이력 공유 + 향후 서브프로젝트 추가 용이
**영향**: 루트에 `time-ledger/` 서브디렉토리. Vercel 배포는 별도 프로젝트 연결 또는 monorepo 세팅 필요 (후속 결정)

---

## 2026-04-23 — Phase 1 + Phase 2 동시 구현

**결정**: 명세 Phase 1(완료로 표기됨)을 실제로 코드화하면서 Phase 2 v1.1 전체를 한 번에 구현
**배경**: 스펙에는 Phase 1이 "[구현 완료]"이지만 실제 소스 없음. Phase 2는 Phase 1 기반을 요구
**대안**:
- 티켓 순서대로 T01부터 하나씩: 안전하지만 느리고 중간 결과물이 앙상
- 뼈대만 만들고 기능 스텁: 검증 불가
**근거**: 명세·디자인 가이드가 매우 구체적이어서 일관된 스타일로 한 번에 구현 가능. 중간에 나눠도 같은 결정들을 반복할 뿐
**영향**: 전 컴포넌트. 빌드 성공(npm run build 통과)으로 1차 검증

---

## 2026-04-23 — Tailwind core + inline style 병행 (스펙 준수)

**결정**: 카테고리 색상 등 동적 컬러는 inline `style`로 처리, 레이아웃은 Tailwind utility
**배경**: 스펙 CLAUDE.md의 "Tailwind arbitrary value 지양" 원칙
**대안**: 전부 Tailwind arbitrary (`bg-[#C85450]`) — 하지만 동적 값에 취약
**근거**: 카테고리 색상은 사용자 CRUD로 동적, 컬러 팔레트 preset은 고정. 둘 다 inline style이 자연스러움
**영향**: 모든 컴포넌트

---

## 2026-04-23 — 연간 뷰: relatedCategoryIds는 카테고리 ID 기반

**결정**: 연간 목표 ↔ 블라인드 스팟에서 Time Ledger 카테고리를 연결할 때 이름이 아닌 ID(`categories[].id`) 사용
**배경**: 명세 스키마는 `relatedCategoryIds: string[]`. 블라인드 스팟의 `category`는 문자열(블라인드 카테고리 이름)
**대안**: 이름 기반 — 리네임 시 링크 깨짐
**근거**: ID는 안정, 이름은 변경 가능
**영향**: `src/components/yearly/Goals.jsx`, `src/components/blindspots/BlindSpotForm.jsx`

---

## 2026-04-23 — v1.2 분석 로직은 lib/analysis.js에 분리

**결정**: 갭 분석, 요일 패턴, 블라인드 스팟 역추적, 전문 검색을 `src/lib/analysis.js` 단일 모듈에 모음
**배경**: v1.2 기능 4개가 모두 `entries + blindspots + categories` 조합을 순회하는 읽기 전용 파생 데이터 계산
**대안**:
- 각 뷰 컴포넌트에 로직 내장: 중복·재사용 불가
- 커스텀 Hook: 파생값이 단순해서 과도
**근거**: 순수 함수 집합이라 hook보다 import가 깔끔, 테스트/재사용 용이
**영향**: `src/lib/analysis.js`, `components/today/PlanVsActual.jsx`, `components/monthly/WeekdayPattern.jsx`, `components/monthly/PlanVsActualMonth.jsx`, `components/yearly/ThemeAlignment.jsx`, `components/common/SearchDialog.jsx`

---

## 2026-04-23 — 검색 진입점: Header 버튼 + ⌘/Ctrl+K

**결정**: 검색 모달을 전역 단축키(⌘K / Ctrl+K) + Header의 검색 버튼 두 경로로 제공
**배경**: 명세에는 "검색" 기능만 기술, UX 트리거 미지정
**대안**: 탭으로 분리(영역 낭비), 우하단 플로팅(editorial minimalism 위반)
**근거**: Linear/Notion/GitHub 패턴과 일치. 키보드 사용자 경로 확보
**영향**: `src/App.jsx` (keydown listener), `src/components/common/Header.jsx`, `src/components/common/SearchDialog.jsx`

---

## 2026-04-23 — 분기 테마 정렬도: 목표 카테고리 시간 비중으로 계산

**결정**: 각 분기의 "정렬도 %" = (해당 분기 목표 카테고리 시간) / (분기 전체 시간)
**배경**: 명세 3.3-D에 "계획했던 비중 vs 실제 비중" 비교 옵션 언급. 계획 비중의 정의가 모호
**대안**:
- 분기별로 별도 카테고리 비중 입력받기: 입력 마찰 증가 (3초 입력 원칙 위반)
- 목표 진행률과 비교: 진행률은 수동 값이라 시간 배분 반영 안 함
**근거**: 이미 "연간 목표 → 관련 카테고리"가 연결됨. 그 카테고리들에 몽브님이 실제로 시간을 얼마나 썼는지가 곧 정렬도. 추가 입력 0
**영향**: `src/lib/analysis.js::quarterThemeAlignment`, `src/components/yearly/ThemeAlignment.jsx`
