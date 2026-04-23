// Time Ledger 기본 카테고리 (CLAUDE.md § 디자인 언어 · 카테고리 컬러 팔레트)
export const DEFAULT_CATEGORIES = [
  { id: 'cat-compliance', name: '인증·컴플라이언스', color: '#C85450' },
  { id: 'cat-planning', name: '상세기획', color: '#D4883F' },
  { id: 'cat-marketing', name: '마케팅·콘텐츠', color: '#5C8A6E' },
  { id: 'cat-ai', name: 'AI·자동화 학습', color: '#4A6FA5' },
  { id: 'cat-cs', name: 'CS·고객대응', color: '#8B6BA8' },
  { id: 'cat-product', name: '상품개발·소싱', color: '#7A5545' },
  { id: 'cat-ops', name: '운영·재무', color: '#2C4A52' },
  { id: 'cat-hr', name: '채용·HR', color: '#A6625A' },
  { id: 'cat-strategy', name: '전략·기획', color: '#6B6B4C' },
  { id: 'cat-misc', name: '기타', color: '#8A8A8A' },
];

// 블라인드 스팟 카테고리 (명세 3.4-A)
export const DEFAULT_BLINDSPOT_CATEGORIES = [
  { id: 'bs-compliance', name: '인증·법무', color: '#C85450' },
  { id: 'bs-finance', name: '정산·재무', color: '#2C4A52' },
  { id: 'bs-supply', name: '재고·공급망', color: '#7A5545' },
  { id: 'bs-marketing', name: '마케팅', color: '#5C8A6E' },
  { id: 'bs-contract', name: '계약', color: '#A6625A' },
  { id: 'bs-cx', name: '고객경험', color: '#8B6BA8' },
  { id: 'bs-platform', name: '플랫폼정책', color: '#4A6FA5' },
  { id: 'bs-misc', name: '기타', color: '#8A8A8A' },
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
