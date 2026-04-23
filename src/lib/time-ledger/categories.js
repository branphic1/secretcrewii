// Time Ledger 기본 카테고리 — 스티커·동화책 톤 (채도 ↑, 밝기 ↑)
export const DEFAULT_CATEGORIES = [
  { id: 'cat-compliance', name: '인증·컴플라이언스', color: '#FF6B6B' }, // 코랄 레드
  { id: 'cat-planning',   name: '상세기획',           color: '#FFB547' }, // 탠저린
  { id: 'cat-marketing',  name: '마케팅·콘텐츠',      color: '#5AD2B3' }, // 브라이트 민트
  { id: 'cat-ai',         name: 'AI·자동화 학습',     color: '#4D96FF' }, // 크레용 블루
  { id: 'cat-cs',         name: 'CS·고객대응',        color: '#A78BFA' }, // 라벤더 바이올렛
  { id: 'cat-product',    name: '상품개발·소싱',      color: '#FF9F7A' }, // 샤벳 피치
  { id: 'cat-ops',        name: '운영·재무',          color: '#29C7B9' }, // 티얼 그린
  { id: 'cat-hr',         name: '채용·HR',            color: '#FF8FAB' }, // 버블검 핑크
  { id: 'cat-strategy',   name: '전략·기획',          color: '#F9C74F' }, // 선샤인 옐로우
  { id: 'cat-misc',       name: '기타',               color: '#9DB0B8' }, // 스모키 그레이
];

// 블라인드 스팟 카테고리 (명세 3.4-A) — 같은 톤 스케일
export const DEFAULT_BLINDSPOT_CATEGORIES = [
  { id: 'bs-compliance', name: '인증·법무',     color: '#FF6B6B' },
  { id: 'bs-finance',    name: '정산·재무',     color: '#29C7B9' },
  { id: 'bs-supply',     name: '재고·공급망',   color: '#FF9F7A' },
  { id: 'bs-marketing',  name: '마케팅',        color: '#5AD2B3' },
  { id: 'bs-contract',   name: '계약',          color: '#FF8FAB' },
  { id: 'bs-cx',         name: '고객경험',      color: '#A78BFA' },
  { id: 'bs-platform',   name: '플랫폼정책',    color: '#4D96FF' },
  { id: 'bs-misc',       name: '기타',          color: '#9DB0B8' },
];

// 이커머스 운영자용 블라인드 스팟 기본 템플릿 (명세 3.4-E)
export const BLINDSPOT_TEMPLATE = [
  { title: 'KC 인증 갱신 확인', type: 'recurring', category: '인증·법무', frequency: 'yearly', severity: 'high' },
  { title: '특허 연차료 납부', type: 'recurring', category: '인증·법무', frequency: 'yearly', severity: 'high' },
  { title: '상표 갱신 확인', type: 'deadline', category: '인증·법무', severity: 'high' },
  { title: '플랫폼별 정산 내역 대조', type: 'recurring', category: '정산·재무', frequency: 'monthly', severity: 'medium' },
  { title: '부가세 신고', type: 'recurring', category: '정산·재무', frequency: 'quarterly', severity: 'high' },
  { title: '재고 소진 예상일 점검', type: 'recurring', category: '재고·공급망', frequency: 'weekly', severity: 'medium' },
  { title: '광고 소재 교체', type: 'recurring', category: '마케팅', frequency: 'monthly', severity: 'low' },
  { title: '체험단 리뷰 업로드 마감', type: 'deadline', category: '마케팅', severity: 'medium' },
  { title: '공급사 계약 만료', type: 'deadline', category: '계약', severity: 'high' },
  { title: 'CS 반복 문의 FAQ 반영', type: 'recurring', category: '고객경험', frequency: 'monthly', severity: 'low' },
  { title: '네이버·쿠팡 정책 공지 확인', type: 'recurring', category: '플랫폼정책', frequency: 'weekly', severity: 'medium' },
  { title: '경쟁사 주요 변동 모니터링', type: 'recurring', category: '기타', frequency: 'monthly', severity: 'low' },
];
