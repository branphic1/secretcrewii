// Deck Builder 데이터 모델

export type DeckStatus = "draft" | "extracting" | "reviewing" | "building" | "done" | "failed";

export interface DeckPerson {
  rawLabel: string;     // 클로바 원본 라벨 (예: "참석자 1")
  name: string;         // 매핑 실명 (예: "박성우")
  role?: string;        // 직책/소속
  accent?: "accent1" | "accent2" | null; // 인용 카드 좌측 바 색
}

export interface DeckProfile {
  user_id: string;
  company_name: string | null;
  logo_url: string | null;
  accent1_hex: string;       // 강조색 1 (예: "D94A35")
  accent2_hex: string;       // 강조색 2 (예: "B8893E")
  default_categories: string[];
  default_people: DeckPerson[];
  vocabulary: string[];      // 시장 언어 후보 단어장
  updated_at: string;
}

// Stage 1 추출 결과
export interface ExtractedQuote {
  timestamp: string;
  speaker: string;
  text: string;
  starred?: boolean;
}

export interface ExtractedMarker {
  timestamp: string;
  title: string;
  summary: string;
}

export interface ExtractedPhase {
  title: string;
  range: string;
  summary: string;
}

export interface ExtractedDataPoint {
  value: string;
  unit: string;
  context: string;
  timestamp?: string;
}

export interface ExtractedParticipant {
  rawLabel: string;
  inferredName: string | null;
  inferredRole: string | null;
  utteranceCount: number;
}

export interface ExtractedContent {
  coreThesis: { text: string; speaker: string; timestamp: string };
  bestQuotes: ExtractedQuote[];
  timelineMarkers: ExtractedMarker[];
  phases: ExtractedPhase[];
  dataPoints: ExtractedDataPoint[];
  actionItems: string[];
  participants: ExtractedParticipant[];
  category: string;          // "기획" / "마케팅" / etc.
  executiveSummary: string;  // 한 문장 (60자 이내)
  nextAgenda: string[];
}

export interface DeckSupplement {
  type: "ai_response" | "web_search" | "internal_doc" | "note";
  name: string;
  text: string;        // 텍스트 본문 (PDF/OCR 은 V1)
}

export interface Deck {
  id: string;
  user_id: string;
  title: string;
  meeting_date: string;
  duration_minutes: number | null;
  raw_transcript: string | null;
  extracted: ExtractedContent | null;
  supplements: DeckSupplement[];
  people_mapping: DeckPerson[];
  pptx_url: string | null;
  docx_url: string | null;
  status: DeckStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export type SlideType =
  | "cover"
  | "toc"
  | "pull-quote"
  | "timeline"
  | "quote-grid"
  | "tri-card"
  | "data-catalog"
  | "closing";

export interface SlideDef {
  idx: number;
  type: SlideType;
  section_num?: string;
  title?: string;
  subtitle?: string;
  data: Record<string, unknown>;
}
