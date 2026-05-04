export type Priority = "high" | "medium" | "low";
export type MeetingStatus = "draft" | "analyzing" | "reviewed" | "finalized" | "failed";
export type ActionItemStatus = "pending" | "in_progress" | "done";

export interface Participant {
  id: string;
  raw_label: string;
  name: string | null;
  role: string | null;
  is_external: boolean;
  utterance_count: number;
  order_idx: number;
}

export interface Decision {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  rationale: string | null;
  source_timestamp: string | null;
  order_idx: number;
}

export interface Section {
  id: string;
  title: string;
  bullets: string[];
  order_idx: number;
}

export interface ActionItem {
  id: string;
  title: string;
  description: string | null;
  owner_name: string | null;
  due_date: string | null;
  priority: Priority;
  status: ActionItemStatus;
  source_timestamp: string | null;
  order_idx: number;
}

export interface Risk {
  id: string;
  title: string;
  description: string | null;
  severity: Priority;
  mitigation: string | null;
  order_idx: number;
}

export interface Meeting {
  id: string;
  title: string;
  meeting_date: string;
  duration_minutes: number | null;
  raw_transcript: string | null;
  executive_summary: string | null;
  next_agenda: string[];
  status: MeetingStatus;
  analyze_error: string | null;
  docx_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeetingWithRelations extends Meeting {
  participants: Participant[];
  decisions: Decision[];
  sections: Section[];
  action_items: ActionItem[];
  risks: Risk[];
}

// Claude tool 응답 스키마
export interface ClaudeAnalysisResult {
  executiveSummary: string;
  participants: Array<{
    rawLabel: string;
    inferredName: string | null;
    inferredRole: string | null;
    utteranceCount: number;
  }>;
  keyDecisions: Array<{
    title: string;
    description: string;
    category?: string;
    sourceTimestamp?: string;
  }>;
  sections: Array<{
    title: string;
    bullets: string[];
  }>;
  actionItems: Array<{
    title: string;
    description?: string;
    ownerName?: string;
    dueDate?: string;
    priority: Priority;
    sourceTimestamp?: string;
  }>;
  risks: Array<{
    title: string;
    description: string;
    severity: Priority;
    mitigation?: string;
  }>;
  nextAgenda: string[];
}
