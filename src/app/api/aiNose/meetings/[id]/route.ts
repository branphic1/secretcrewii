import { NextResponse } from "next/server";
import { createAiNoseAdmin } from "@/lib/aiNose/supabaseAdmin";
import type {
  ActionItem,
  Decision,
  MeetingWithRelations,
  Participant,
  Risk,
  Section,
} from "@/lib/aiNose/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const sb = createAiNoseAdmin();
  const id = params.id;
  const [m, p, d, s, a, r] = await Promise.all([
    sb.from("ainose_meetings").select("*").eq("id", id).maybeSingle(),
    sb.from("ainose_participants").select("*").eq("meeting_id", id).order("order_idx"),
    sb.from("ainose_decisions").select("*").eq("meeting_id", id).order("order_idx"),
    sb.from("ainose_sections").select("*").eq("meeting_id", id).order("order_idx"),
    sb.from("ainose_action_items").select("*").eq("meeting_id", id).order("order_idx"),
    sb.from("ainose_risks").select("*").eq("meeting_id", id).order("order_idx"),
  ]);
  if (m.error) return NextResponse.json({ ok: false, error: m.error.message }, { status: 500 });
  if (!m.data) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const meeting: MeetingWithRelations = {
    ...m.data,
    next_agenda: Array.isArray(m.data.next_agenda) ? m.data.next_agenda : [],
    participants: (p.data || []) as Participant[],
    decisions: (d.data || []) as Decision[],
    sections: ((s.data || []) as Section[]).map((row) => ({
      ...row,
      bullets: Array.isArray(row.bullets) ? row.bullets : [],
    })),
    action_items: (a.data || []) as ActionItem[],
    risks: (r.data || []) as Risk[],
  };
  return NextResponse.json({ ok: true, meeting });
}

// 검토 화면 저장 — 전체 덮어쓰기 (단순화)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = (await req.json()) as {
      title?: string;
      executive_summary?: string;
      next_agenda?: string[];
      participants?: Partial<Participant>[];
      decisions?: Partial<Decision>[];
      sections?: Partial<Section>[];
      action_items?: Partial<ActionItem>[];
      risks?: Partial<Risk>[];
      status?: "draft" | "reviewed" | "finalized";
    };
    const id = params.id;
    const sb = createAiNoseAdmin();

    const meetingPatch: Record<string, unknown> = {};
    if (typeof body.title === "string") meetingPatch.title = body.title;
    if (typeof body.executive_summary === "string") meetingPatch.executive_summary = body.executive_summary;
    if (Array.isArray(body.next_agenda)) meetingPatch.next_agenda = body.next_agenda;
    if (typeof body.status === "string") meetingPatch.status = body.status;

    if (Object.keys(meetingPatch).length) {
      const { error } = await sb.from("ainose_meetings").update(meetingPatch).eq("id", id);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // 재배열 + 재삽입 패턴 (단순함 우선)
    const replaceChildren = async <T extends Record<string, unknown>>(
      table: string,
      rows: Partial<T>[] | undefined,
      mapper: (r: Partial<T>, idx: number) => Record<string, unknown>
    ) => {
      if (!Array.isArray(rows)) return;
      const del = await sb.from(table).delete().eq("meeting_id", id);
      if (del.error) throw new Error(`${table} 삭제: ${del.error.message}`);
      if (rows.length === 0) return;
      const insertRows = rows.map((r, i) => ({ ...mapper(r, i), meeting_id: id }));
      const ins = await sb.from(table).insert(insertRows);
      if (ins.error) throw new Error(`${table} 삽입: ${ins.error.message}`);
    };

    await replaceChildren("ainose_participants", body.participants, (r, i) => ({
      raw_label: r.raw_label || `참석자 ${i + 1}`,
      name: r.name ?? null,
      role: r.role ?? null,
      is_external: Boolean(r.is_external),
      utterance_count: typeof r.utterance_count === "number" ? r.utterance_count : 0,
      order_idx: i,
    }));
    await replaceChildren("ainose_decisions", body.decisions, (r, i) => ({
      title: r.title || "(제목 없음)",
      description: r.description ?? null,
      category: r.category ?? null,
      rationale: r.rationale ?? null,
      source_timestamp: r.source_timestamp ?? null,
      order_idx: i,
    }));
    await replaceChildren("ainose_sections", body.sections, (r, i) => ({
      title: r.title || "(제목 없음)",
      bullets: Array.isArray(r.bullets) ? r.bullets : [],
      order_idx: i,
    }));
    await replaceChildren("ainose_action_items", body.action_items, (r, i) => ({
      title: r.title || "(제목 없음)",
      description: r.description ?? null,
      owner_name: r.owner_name ?? null,
      due_date: r.due_date ?? null,
      priority: r.priority || "medium",
      status: r.status || "pending",
      source_timestamp: r.source_timestamp ?? null,
      order_idx: i,
    }));
    await replaceChildren("ainose_risks", body.risks, (r, i) => ({
      title: r.title || "(제목 없음)",
      description: r.description ?? null,
      severity: r.severity || "medium",
      mitigation: r.mitigation ?? null,
      order_idx: i,
    }));

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const sb = createAiNoseAdmin();
  const { error } = await sb.from("ainose_meetings").delete().eq("id", params.id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
