import { ExtractedContent, DeckProfile } from "./types";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

function buildSystemPrompt(profile: DeckProfile | null) {
  const parts: string[] = [];
  parts.push(
    "당신은 회의록을 분석해 발표 자료(슬라이드 + Word 가이드)로 재구성하기 위한 핵심 컨텐츠를 추출하는 시스템입니다."
  );
  parts.push(
    "클로바노트가 자동전사한 회의 텍스트(발화 오인식·잡담 포함)를 받아, 검토·편집 가능한 구조화된 JSON으로 변환합니다."
  );

  if (profile?.company_name) {
    parts.push(`\n## 사용자 컨텍스트\n- 회사명: ${profile.company_name}`);
  }
  if (profile?.default_categories?.length) {
    parts.push(`- 자주 다루는 카테고리: ${profile.default_categories.join(" / ")}`);
  }
  if (profile?.default_people?.length) {
    parts.push("- 자주 등장하는 인물 (참고용 — 발화 화자 매핑에 활용):");
    for (const p of profile.default_people) {
      parts.push(`  · ${p.name}${p.role ? ` (${p.role})` : ""}`);
    }
  }
  if (profile?.vocabulary?.length) {
    parts.push(`- 사내/도메인 고유어 (오인식 보정 시 참고): ${profile.vocabulary.join(", ")}`);
  }

  parts.push(`
## 추출 원칙
1. 잡담·인사·잡담 같은 비업무 발화는 모두 제외
2. 발화 오인식은 맥락 추론해 수정
3. 같은 주제 발화는 시간대 무관하게 통합
4. 결정 사항과 논의 중 사항을 명확히 구분
5. 액션 아이템은 "누가 무엇을 언제까지" 형태로 (불명확하면 "미정")
6. 참석자 발언을 그대로 인용하지 말고 사실 요약
7. 추측은 "(추정)" 표기

## 출력
반드시 save_extraction 도구를 호출해 결과 반환. 모든 필드 필수, 비어있어도 빈 배열 [] 명시. 절대 키 생략 금지.
한국어로 작성. 마크다운 금지.`);

  return parts.join("\n");
}

const TOOL = {
  name: "save_extraction",
  description: "회의록에서 추출된 핵심 컨텐츠 저장",
  input_schema: {
    type: "object",
    required: [
      "coreThesis",
      "executiveSummary",
      "category",
      "participants",
      "bestQuotes",
      "timelineMarkers",
      "phases",
      "dataPoints",
      "actionItems",
      "nextAgenda",
    ],
    properties: {
      coreThesis: {
        type: "object",
        required: ["text", "speaker", "timestamp"],
        properties: {
          text: { type: "string", description: "회의의 한 줄 핵심 명제" },
          speaker: { type: "string", description: "이 명제를 발화한 화자" },
          timestamp: { type: "string", description: "MM:SS" },
        },
      },
      executiveSummary: { type: "string", description: "60자 이내 한 문장 요약" },
      category: {
        type: "string",
        description: "회의 카테고리 (사용자 default_categories 참고하거나 새로 추론)",
      },
      participants: {
        type: "array",
        items: {
          type: "object",
          required: ["rawLabel", "utteranceCount"],
          properties: {
            rawLabel: { type: "string" },
            inferredName: { type: ["string", "null"] },
            inferredRole: { type: ["string", "null"] },
            utteranceCount: { type: "number" },
          },
        },
      },
      bestQuotes: {
        type: "array",
        description: "임팩트 있는 발화 8~12개 (★ 표시는 사람이 결정 — starred 는 false 로 두기)",
        items: {
          type: "object",
          required: ["timestamp", "speaker", "text"],
          properties: {
            timestamp: { type: "string" },
            speaker: { type: "string" },
            text: { type: "string" },
            starred: { type: "boolean" },
          },
        },
      },
      timelineMarkers: {
        type: "array",
        description: "회의 흐름 분기점 6~10개",
        items: {
          type: "object",
          required: ["timestamp", "title", "summary"],
          properties: {
            timestamp: { type: "string" },
            title: { type: "string" },
            summary: { type: "string" },
          },
        },
      },
      phases: {
        type: "array",
        description: "회의를 2~4개 phase로 분할",
        items: {
          type: "object",
          required: ["title", "range", "summary"],
          properties: {
            title: { type: "string" },
            range: { type: "string", description: "예: 00:00–17:00" },
            summary: { type: "string" },
          },
        },
      },
      dataPoints: {
        type: "array",
        description: "회의 중 언급된 모든 정량 수치",
        items: {
          type: "object",
          required: ["value", "unit", "context"],
          properties: {
            value: { type: "string" },
            unit: { type: "string" },
            context: { type: "string", description: "이 수치가 무엇을 의미하는지" },
            timestamp: { type: "string" },
          },
        },
      },
      actionItems: { type: "array", items: { type: "string" } },
      nextAgenda: { type: "array", items: { type: "string" } },
    },
  },
};

export async function extractMeetingContent(params: {
  cleanedTranscript: string;
  meetingTitle: string;
  meetingDate: string;
  profile: DeckProfile | null;
}): Promise<ExtractedContent> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY 가 설정되지 않았습니다.");
  const model = process.env.ANTHROPIC_MODEL || "claude-opus-4-7";

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
        model,
        max_tokens: 16000,
        system: buildSystemPrompt(params.profile),
        tools: [TOOL],
        tool_choice: { type: "tool", name: "save_extraction" },
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
      content?: Array<{ type: string; name?: string; input?: ExtractedContent; text?: string }>;
      stop_reason?: string;
    };
    const tool = data.content?.find((b) => b.type === "tool_use" && b.name === "save_extraction");
    if (!tool?.input) {
      const txt = data.content?.find((b) => b.type === "text");
      console.error("[deck] tool_use missing", { stop_reason: data.stop_reason, text: txt?.text?.slice(0, 500) });
      throw new Error(`Claude tool_use 결과 누락. stop_reason=${data.stop_reason || "unknown"}`);
    }
    const r = tool.input;
    return {
      coreThesis: r.coreThesis || { text: "", speaker: "", timestamp: "" },
      executiveSummary: r.executiveSummary || "",
      category: r.category || "기타",
      participants: r.participants || [],
      bestQuotes: r.bestQuotes || [],
      timelineMarkers: r.timelineMarkers || [],
      phases: r.phases || [],
      dataPoints: r.dataPoints || [],
      actionItems: r.actionItems || [],
      nextAgenda: r.nextAgenda || [],
    };
  } finally {
    clearTimeout(timeout);
  }
}
