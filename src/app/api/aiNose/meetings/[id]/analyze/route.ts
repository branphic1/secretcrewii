import { NextResponse } from "next/server";
import { createAiNoseAdmin } from "@/lib/aiNose/supabaseAdmin";
import { analyzeMeetingTranscript } from "@/lib/aiNose/claude";
import {
  parseClovaText,
  summarizeParticipants,
  utterancesToCleanedTranscript,
} from "@/lib/aiNose/clovaParser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const sb = createAiNoseAdmin();
  const id = params.id;

  // 1) 회의 로드
  const { data: meeting, error: loadErr } = await sb
    .from("ainose_meetings")
    .select("id, title, meeting_date, raw_transcript")
    .eq("id", id)
    .maybeSingle();
  if (loadErr) return NextResponse.json({ ok: false, error: loadErr.message }, { status: 500 });
  if (!meeting) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (!meeting.raw_transcript) {
    return NextResponse.json({ ok: false, error: "원본 텍스트가 없어요." }, { status: 400 });
  }

  // 2) 상태 업데이트 (analyzing)
  await sb.from("ainose_meetings").update({ status: "analyzing", analyze_error: null }).eq("id", id);

  try {
    // 3) 클로바 파싱
    const utts = parseClovaText(meeting.raw_transcript);
    if (utts.length === 0) {
      throw new Error("발화를 찾지 못했어요. 클로바노트 .txt 형식이 맞는지 확인해 주세요.");
    }
    const partsSummary = summarizeParticipants(utts);
    const cleaned = utterancesToCleanedTranscript(utts);

    // 4) Claude 호출
    const result = await analyzeMeetingTranscript({
      cleanedTranscript: cleaned,
      meetingTitle: meeting.title,
      meetingDate: meeting.meeting_date,
    });

    // 5) 기존 자식 행 삭제 후 재삽입
    await Promise.all([
      sb.from("ainose_participants").delete().eq("meeting_id", id),
      sb.from("ainose_decisions").delete().eq("meeting_id", id),
      sb.from("ainose_sections").delete().eq("meeting_id", id),
      sb.from("ainose_action_items").delete().eq("meeting_id", id),
      sb.from("ainose_risks").delete().eq("meeting_id", id),
    ]);

    // participants — 클로바 카운트로 보정
    const partRows = result.participants.map((p, i) => {
      const found = partsSummary.find((s) => s.label === p.rawLabel);
      return {
        meeting_id: id,
        raw_label: p.rawLabel,
        name: p.inferredName,
        role: p.inferredRole,
        is_external: false,
        utterance_count: found?.count ?? p.utteranceCount ?? 0,
        order_idx: i,
      };
    });

    const decisionRows = result.keyDecisions.map((d, i) => ({
      meeting_id: id,
      title: d.title,
      description: d.description,
      category: d.category ?? null,
      source_timestamp: d.sourceTimestamp ?? null,
      order_idx: i,
    }));

    const sectionRows = result.sections.map((s, i) => ({
      meeting_id: id,
      title: s.title,
      bullets: s.bullets,
      order_idx: i,
    }));

    const actionRows = result.actionItems.map((a, i) => ({
      meeting_id: id,
      title: a.title,
      description: a.description ?? null,
      owner_name: a.ownerName ?? null,
      due_date: a.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(a.dueDate) ? a.dueDate : null,
      priority: a.priority,
      status: "pending" as const,
      source_timestamp: a.sourceTimestamp ?? null,
      order_idx: i,
    }));

    const riskRows = result.risks.map((r, i) => ({
      meeting_id: id,
      title: r.title,
      description: r.description,
      severity: r.severity,
      mitigation: r.mitigation ?? null,
      order_idx: i,
    }));

    if (partRows.length) {
      const { error } = await sb.from("ainose_participants").insert(partRows);
      if (error) throw new Error(`participants: ${error.message}`);
    }
    if (decisionRows.length) {
      const { error } = await sb.from("ainose_decisions").insert(decisionRows);
      if (error) throw new Error(`decisions: ${error.message}`);
    }
    if (sectionRows.length) {
      const { error } = await sb.from("ainose_sections").insert(sectionRows);
      if (error) throw new Error(`sections: ${error.message}`);
    }
    if (actionRows.length) {
      const { error } = await sb.from("ainose_action_items").insert(actionRows);
      if (error) throw new Error(`action_items: ${error.message}`);
    }
    if (riskRows.length) {
      const { error } = await sb.from("ainose_risks").insert(riskRows);
      if (error) throw new Error(`risks: ${error.message}`);
    }

    // 메인 메타 저장
    const { error: updErr } = await sb
      .from("ainose_meetings")
      .update({
        executive_summary: result.executiveSummary,
        next_agenda: result.nextAgenda,
        status: "reviewed",
        analyze_error: null,
      })
      .eq("id", id);
    if (updErr) throw new Error(updErr.message);

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown";
    await sb
      .from("ainose_meetings")
      .update({ status: "failed", analyze_error: msg })
      .eq("id", id);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
