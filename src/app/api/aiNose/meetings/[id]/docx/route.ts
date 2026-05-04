import { NextResponse } from "next/server";
import { createAiNoseAdmin } from "@/lib/aiNose/supabaseAdmin";
import { buildMeetingDocx } from "@/lib/aiNose/docxGen";
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
  if (m.error || !m.data) {
    return NextResponse.json({ ok: false, error: m.error?.message || "Not found" }, { status: 404 });
  }
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

  const buf = await buildMeetingDocx(meeting);
  const safeTitle = (meeting.title || "회의록").replace(/[\\/:*?"<>|]/g, "_").slice(0, 80);
  const dateStr = new Date(meeting.meeting_date).toISOString().slice(0, 10);
  const fileName = encodeURIComponent(`${dateStr}_${safeTitle}.docx`);

  // Buffer → Uint8Array (Next.js 14 NextResponse 타입 호환)
  const body = new Uint8Array(buf);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "content-disposition": `attachment; filename*=UTF-8''${fileName}`,
      "cache-control": "no-store",
    },
  });
}
