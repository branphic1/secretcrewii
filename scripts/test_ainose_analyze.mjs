// 23,486자 회의록을 직접 Claude API에 던져서 tool_use 응답 확인
import { parseClovaText, utterancesToCleanedTranscript } from "../src/lib/aiNose/clovaParser.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const apiKey = process.env.ANTHROPIC_API_KEY;
const model = process.env.ANTHROPIC_MODEL || "claude-opus-4-7";
const mid = "3a7aa153-1f45-432f-aa37-f73893561467";

const r = await fetch(url + "/rest/v1/ainose_meetings?id=eq." + mid + "&select=raw_transcript,title", {
  headers: { apikey: key, authorization: "Bearer " + key },
});
const [m] = await r.json();
const raw = m.raw_transcript;

// 인라인 파서 (TS import 회피)
const HEADER_RE = /^(참석자\s*\d+|화자\s*\d+|[A-Za-zㄱ-힝][^\n]{0,30})\s+(\d{1,2}:\d{2}(?::\d{2})?)\s*$/;
function parse(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let cur = null;
  for (const l of lines) {
    const t = l.trim();
    if (!t) { if (cur && cur.text.trim()) { out.push(cur); cur = null; } continue; }
    const mm = HEADER_RE.exec(t);
    if (mm) {
      if (cur && cur.text.trim()) out.push(cur);
      cur = { participant: mm[1].trim(), timestamp: mm[2], text: "" };
    } else {
      if (!cur) cur = { participant: "참석자 1", timestamp: null, text: "" };
      cur.text += (cur.text ? "\n" : "") + t;
    }
  }
  if (cur && cur.text.trim()) out.push(cur);
  return out;
}

const utts = parse(raw);
const cleaned = utts.map(u => `[${u.participant}${u.timestamp ? " " + u.timestamp : ""}] ${u.text}`).join("\n\n");

console.log("총 발화:", utts.length);
console.log("정제 transcript 길이:", cleaned.length);
console.log("approx tokens (chars/2.5):", Math.round(cleaned.length / 2.5));
console.log();

const TOOL = {
  name: "save_meeting_minutes",
  description: "회의록 저장",
  input_schema: {
    type: "object",
    required: ["executiveSummary","participants","keyDecisions","sections","actionItems","risks","nextAgenda"],
    properties: {
      executiveSummary: { type: "string" },
      participants: { type: "array", items: { type: "object" } },
      keyDecisions: { type: "array", items: { type: "object" } },
      sections: { type: "array", items: { type: "object" } },
      actionItems: { type: "array", items: { type: "object" } },
      risks: { type: "array", items: { type: "object" } },
      nextAgenda: { type: "array", items: { type: "string" } },
    },
  },
};

const start = Date.now();
const res = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
  body: JSON.stringify({
    model,
    max_tokens: 16000,
    system: "회의록 정제 AI. save_meeting_minutes 도구를 호출해 결과 반환.",
    tools: [TOOL],
    tool_choice: { type: "tool", name: "save_meeting_minutes" },
    messages: [{ role: "user", content: `회의명: ${m.title}\n\n${cleaned}` }],
  }),
});
const elapsed = ((Date.now() - start) / 1000).toFixed(1);
const data = await res.json();
console.log("HTTP:", res.status, "elapsed:", elapsed, "s");
console.log("stop_reason:", data.stop_reason);
console.log("usage:", JSON.stringify(data.usage));
const tool = data.content?.find(c => c.type === "tool_use");
const text = data.content?.find(c => c.type === "text");
if (tool) {
  console.log("\ntool_use found:");
  console.log("  participants:", tool.input.participants?.length ?? "MISSING");
  console.log("  keyDecisions:", tool.input.keyDecisions?.length ?? "MISSING");
  console.log("  sections:", tool.input.sections?.length ?? "MISSING");
  console.log("  actionItems:", tool.input.actionItems?.length ?? "MISSING");
  console.log("  risks:", tool.input.risks?.length ?? "MISSING");
  console.log("  executiveSummary:", JSON.stringify(tool.input.executiveSummary));
} else {
  console.log("NO tool_use block!");
  console.log("text block:", text?.text?.slice(0, 1000));
}
console.log("\nFULL response (first 2000 chars):");
console.log(JSON.stringify(data, null, 2).slice(0, 2000));
