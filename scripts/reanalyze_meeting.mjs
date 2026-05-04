// 빈 finalized 상태인 회의를 service_role로 직접 재분석해서 DB에 채움
// 사용법: node --env-file=.env.local scripts/reanalyze_meeting.mjs <meeting_id>

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const apiKey = process.env.ANTHROPIC_API_KEY;
const model = process.env.ANTHROPIC_MODEL || "claude-opus-4-7";
const mid = process.argv[2];
if (!mid) { console.error("meeting_id 필요"); process.exit(1); }

const SB = (path, init = {}) =>
  fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      prefer: init.prefer || "return=representation",
      ...(init.headers || {}),
    },
  });

const HEADER_RE = /^(참석자\s*\d+|화자\s*\d+|[A-Za-zㄱ-힝][^\n]{0,30})\s+(\d{1,2}:\d{2}(?::\d{2})?)\s*$/;
function parse(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out = []; let cur = null;
  for (const l of lines) {
    const t = l.trim();
    if (!t) { if (cur && cur.text.trim()) { out.push(cur); cur = null; } continue; }
    const mm = HEADER_RE.exec(t);
    if (mm) { if (cur && cur.text.trim()) out.push(cur); cur = { participant: mm[1].trim(), timestamp: mm[2], text: "" }; }
    else { if (!cur) cur = { participant: "참석자 1", timestamp: null, text: "" }; cur.text += (cur.text ? "\n" : "") + t; }
  }
  if (cur && cur.text.trim()) out.push(cur);
  return out;
}

const SYSTEM = `당신은 한국 e-커머스 기업 '아이노즈'(육아 흡입기 제품)의 회의록 정제 전문 AI입니다.
주로 OEM 파트너 '에프씨넷(FCNet)'과의 통화·회의를 클로바노트 자동전사 텍스트로 받아,
경영진이 검토하고 사내 공유 가능한 수준의 구조화된 회의록 JSON으로 변환합니다.

## 정제 원칙
1. 잡담·날씨·인사·접속체크 등 비업무 발화는 모두 제외
2. 발화 오인식은 맥락 추론해 수정 ("BB" ↔ "비밥", "노시부" 등 회사 고유어 인식)
3. 같은 주제 발화를 시간대 무관하게 통합 정리
4. 결정된 사항과 논의 중인 사항을 명확히 구분
5. 액션 아이템은 "누가 무엇을 언제까지" 형태로 추출
6. 참석자 발언을 그대로 인용하지 말고 사실 요약

반드시 save_meeting_minutes 도구를 호출. 비어있는 카테고리도 빈 배열 [] 로 명시. 절대 필드 생략 금지.`;

const TOOL = {
  name: "save_meeting_minutes",
  description: "정제된 회의록 데이터 저장",
  input_schema: {
    type: "object",
    required: ["executiveSummary","participants","keyDecisions","sections","actionItems","risks","nextAgenda"],
    properties: {
      executiveSummary: { type: "string", description: "회의 한 문장 요약 (60자 이내)" },
      participants: { type: "array", items: { type: "object", required: ["rawLabel","utteranceCount"], properties: {
        rawLabel: { type: "string" }, inferredName: { type: ["string","null"] },
        inferredRole: { type: ["string","null"] }, utteranceCount: { type: "number" }
      }}},
      keyDecisions: { type: "array", items: { type: "object", required: ["title","description"], properties: {
        title: { type: "string" }, description: { type: "string" },
        category: { type: "string" }, sourceTimestamp: { type: "string" }
      }}},
      sections: { type: "array", items: { type: "object", required: ["title","bullets"], properties: {
        title: { type: "string" }, bullets: { type: "array", items: { type: "string" }}
      }}},
      actionItems: { type: "array", items: { type: "object", required: ["title","priority"], properties: {
        title: { type: "string" }, description: { type: "string" }, ownerName: { type: "string" },
        dueDate: { type: "string" }, priority: { type: "string", enum: ["high","medium","low"] },
        sourceTimestamp: { type: "string" }
      }}},
      risks: { type: "array", items: { type: "object", required: ["title","description","severity"], properties: {
        title: { type: "string" }, description: { type: "string" },
        severity: { type: "string", enum: ["high","medium","low"] }, mitigation: { type: "string" }
      }}},
      nextAgenda: { type: "array", items: { type: "string" }},
    },
  },
};

console.log(`▶ ${mid} 재분석 시작...`);
const m = await (await SB(`ainose_meetings?id=eq.${mid}&select=raw_transcript,title,meeting_date`)).json();
if (!m[0]) { console.error("회의를 찾지 못했어요."); process.exit(1); }
const utts = parse(m[0].raw_transcript);
const cleaned = utts.map(u => `[${u.participant}${u.timestamp ? " " + u.timestamp : ""}] ${u.text}`).join("\n\n");
console.log(`총 발화: ${utts.length}, 정제 transcript: ${cleaned.length}자`);

const start = Date.now();
const res = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
  body: JSON.stringify({
    model, max_tokens: 16000, system: SYSTEM, tools: [TOOL],
    tool_choice: { type: "tool", name: "save_meeting_minutes" },
    messages: [{ role: "user", content: `회의명: ${m[0].title}\n회의 일시: ${m[0].meeting_date}\n\n--- 클로바노트 원본 ---\n${cleaned}` }],
  }),
});
const data = await res.json();
console.log(`Claude ${((Date.now()-start)/1000).toFixed(1)}s, stop=${data.stop_reason}, usage=${JSON.stringify(data.usage)}`);
const tool = data.content?.find(c => c.type === "tool_use");
if (!tool) { console.error("tool_use 없음:", JSON.stringify(data).slice(0, 500)); process.exit(1); }
const r = tool.input;

const partsCount = new Map();
utts.forEach(u => partsCount.set(u.participant, (partsCount.get(u.participant) ?? 0) + 1));

// 자식 테이블 비우기
for (const t of ["ainose_participants","ainose_decisions","ainose_sections","ainose_action_items","ainose_risks"]) {
  await SB(`${t}?meeting_id=eq.${mid}`, { method: "DELETE" });
}

const insertIfAny = async (table, rows) => {
  if (!rows.length) return;
  const r = await SB(table, { method: "POST", body: JSON.stringify(rows) });
  if (!r.ok) console.error(`${table} insert 실패`, await r.text());
  else console.log(`✓ ${table}: ${rows.length}행`);
};

await insertIfAny("ainose_participants", (r.participants||[]).map((p,i) => ({
  meeting_id: mid, raw_label: p.rawLabel || `참석자 ${i+1}`,
  name: p.inferredName ?? null, role: p.inferredRole ?? null, is_external: false,
  utterance_count: partsCount.get(p.rawLabel) ?? p.utteranceCount ?? 0, order_idx: i
})));
await insertIfAny("ainose_decisions", (r.keyDecisions||[]).map((d,i) => ({
  meeting_id: mid, title: d.title || "(제목없음)", description: d.description ?? null,
  category: d.category ?? null, source_timestamp: d.sourceTimestamp ?? null, order_idx: i
})));
await insertIfAny("ainose_sections", (r.sections||[]).map((s,i) => ({
  meeting_id: mid, title: s.title || "(제목없음)", bullets: Array.isArray(s.bullets) ? s.bullets : [], order_idx: i
})));
await insertIfAny("ainose_action_items", (r.actionItems||[]).map((a,i) => ({
  meeting_id: mid, title: a.title || "(할일없음)", description: a.description ?? null,
  owner_name: a.ownerName ?? null,
  due_date: a.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(a.dueDate) ? a.dueDate : null,
  priority: ["high","medium","low"].includes(a.priority) ? a.priority : "medium",
  status: "pending", source_timestamp: a.sourceTimestamp ?? null, order_idx: i
})));
await insertIfAny("ainose_risks", (r.risks||[]).map((rk,i) => ({
  meeting_id: mid, title: rk.title || "(제목없음)", description: rk.description ?? null,
  severity: ["high","medium","low"].includes(rk.severity) ? rk.severity : "medium",
  mitigation: rk.mitigation ?? null, order_idx: i
})));

await SB(`ainose_meetings?id=eq.${mid}`, {
  method: "PATCH",
  body: JSON.stringify({
    executive_summary: r.executiveSummary || "",
    next_agenda: r.nextAgenda || [],
    status: "reviewed",
    analyze_error: null,
  }),
});
console.log(`✓ 메인 메타 저장 + status=reviewed`);
console.log(`\n완료. https://secretcrewii.vercel.app/aiNose/${mid}/review`);
