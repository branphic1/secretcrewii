import { ClaudeAnalysisResult } from "./types";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-7";

const SYSTEM_PROMPT = `당신은 한국 e-커머스 기업 '아이노즈'(육아 흡입기 제품)의 회의록 정제 전문 AI입니다.
주로 OEM 파트너 '에프씨넷(FCNet)'과의 통화·회의를 클로바노트 자동전사 텍스트로 받아,
경영진이 검토하고 사내 공유 가능한 수준의 구조화된 회의록 JSON으로 변환합니다.

## 정제 원칙
1. 잡담·날씨·날씨·인사·접속체크 등 비업무 발화는 모두 제외
2. 발화 오인식은 맥락 추론해 수정 ("BB" ↔ "비밥", "노시부" 등 회사 고유어 인식)
3. 같은 주제 발화를 시간대 무관하게 통합 정리
4. 결정된 사항과 논의 중인 사항을 명확히 구분
5. 액션 아이템은 "누가 무엇을 언제까지" 형태로 추출 (불명확하면 ownerName="미정", dueDate 생략)
6. participants 의 inferredName 은 발화 문맥(자기소개·호명) 으로 추정, 없으면 null
7. 참석자 발언을 그대로 인용하지 말고 사실 요약
8. 추측은 "(추정)" 표기

## 카테고리 (자동 판별)
신제품개발 / 양산이슈 / CS·품질 / 단가·계약 / 기타

## 출력
반드시 save_meeting_minutes 도구를 호출해 구조화된 결과를 반환하세요.
한국어로 작성. 마크다운 금지.`;

const TOOL_SCHEMA = {
  name: "save_meeting_minutes",
  description: "정제된 회의록 데이터를 저장합니다.",
  input_schema: {
    type: "object",
    required: [
      "executiveSummary",
      "participants",
      "keyDecisions",
      "sections",
      "actionItems",
      "risks",
      "nextAgenda",
    ],
    properties: {
      executiveSummary: {
        type: "string",
        description: "회의 한 문장 요약 (60자 이내, 결정사항 위주)",
      },
      participants: {
        type: "array",
        items: {
          type: "object",
          required: ["rawLabel", "utteranceCount"],
          properties: {
            rawLabel: { type: "string", description: "원본 라벨 (예: 참석자 1)" },
            inferredName: { type: ["string", "null"], description: "추정 실명 또는 null" },
            inferredRole: { type: ["string", "null"], description: "추정 직책/소속 또는 null" },
            utteranceCount: { type: "number" },
          },
        },
      },
      keyDecisions: {
        type: "array",
        items: {
          type: "object",
          required: ["title", "description"],
          properties: {
            title: { type: "string", description: "한 줄 결정 요약" },
            description: { type: "string", description: "상세 (배경·합의 내용)" },
            category: { type: "string" },
            sourceTimestamp: { type: "string", description: "원본 타임스탬프 MM:SS" },
          },
        },
      },
      sections: {
        type: "array",
        description: "본문 섹션 (논의 주제별)",
        items: {
          type: "object",
          required: ["title", "bullets"],
          properties: {
            title: { type: "string" },
            bullets: { type: "array", items: { type: "string" } },
          },
        },
      },
      actionItems: {
        type: "array",
        items: {
          type: "object",
          required: ["title", "priority"],
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            ownerName: { type: "string", description: "담당자명 또는 '미정'" },
            dueDate: { type: "string", description: "YYYY-MM-DD 또는 비움" },
            priority: { type: "string", enum: ["high", "medium", "low"] },
            sourceTimestamp: { type: "string" },
          },
        },
      },
      risks: {
        type: "array",
        items: {
          type: "object",
          required: ["title", "description", "severity"],
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            severity: { type: "string", enum: ["high", "medium", "low"] },
            mitigation: { type: "string" },
          },
        },
      },
      nextAgenda: {
        type: "array",
        items: { type: "string" },
        description: "다음 회의/통화에서 다룰 안건",
      },
    },
  },
};

export async function analyzeMeetingTranscript(params: {
  cleanedTranscript: string;
  meetingTitle: string;
  meetingDate: string;
}): Promise<ClaudeAnalysisResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY 가 설정되지 않았습니다.");

  const userMessage = `회의명: ${params.meetingTitle}
회의 일시: ${params.meetingDate}

--- 클로바노트 원본 발화 ---
${params.cleanedTranscript}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 280_000);

  try {
    const resp = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        max_tokens: 16000,
        system: SYSTEM_PROMPT,
        tools: [TOOL_SCHEMA],
        tool_choice: { type: "tool", name: "save_meeting_minutes" },
        messages: [{ role: "user", content: userMessage }],
      }),
      signal: controller.signal,
    });

    const text = await resp.text();
    if (!resp.ok) {
      let msg = `Claude API ${resp.status}`;
      try {
        const j = JSON.parse(text) as { error?: { message?: string } };
        msg = j?.error?.message || msg;
      } catch {
        msg = text.slice(0, 400) || msg;
      }
      throw new Error(msg);
    }

    const data = JSON.parse(text) as {
      content?: Array<{ type: string; name?: string; input?: ClaudeAnalysisResult }>;
    };
    const toolBlock = data.content?.find(
      (b) => b.type === "tool_use" && b.name === "save_meeting_minutes"
    );
    if (!toolBlock?.input) {
      throw new Error("Claude 응답에서 tool_use 결과를 찾지 못했어요.");
    }
    return toolBlock.input;
  } finally {
    clearTimeout(timeout);
  }
}
