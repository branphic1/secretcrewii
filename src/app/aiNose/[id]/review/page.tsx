"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type {
  ActionItem,
  Decision,
  MeetingWithRelations,
  Section,
  Risk,
  Priority,
} from "@/lib/aiNose/types";

type DraftMeeting = MeetingWithRelations;

const PRIORITY_OPT: Priority[] = ["high", "medium", "low"];
const PRIORITY_LABEL: Record<Priority, string> = {
  high: "🔴 높음",
  medium: "🟡 보통",
  low: "🟢 낮음",
};

function newId() {
  return `tmp_${Math.random().toString(36).slice(2, 10)}`;
}

export default function AiNoseReviewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [meeting, setMeeting] = useState<DraftMeeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [reanalyzing, setReanalyzing] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/aiNose/meetings/${id}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "불러오기 실패");
      setMeeting(data.meeting);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) load();
  }, [id]);

  function patch(updater: (m: DraftMeeting) => DraftMeeting) {
    setMeeting((prev) => (prev ? updater(prev) : prev));
  }

  async function save(opts: { andFinalize?: boolean } = {}) {
    if (!meeting) return;
    setSaving(true);
    setError(null);
    try {
      const body = {
        title: meeting.title,
        executive_summary: meeting.executive_summary,
        next_agenda: meeting.next_agenda,
        participants: meeting.participants,
        decisions: meeting.decisions,
        sections: meeting.sections,
        action_items: meeting.action_items,
        risks: meeting.risks,
        status: opts.andFinalize ? "finalized" : "reviewed",
      };
      const res = await fetch(`/api/aiNose/meetings/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "저장 실패");
      setSavedAt(new Date().toLocaleTimeString("ko-KR"));
      if (opts.andFinalize) {
        router.push(`/aiNose/${id}/output`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown");
    } finally {
      setSaving(false);
    }
  }

  async function reanalyze() {
    if (!confirm("AI 재분석할까요? 현재 편집한 내용은 모두 사라집니다.")) return;
    setReanalyzing(true);
    setError(null);
    try {
      const res = await fetch(`/api/aiNose/meetings/${id}/analyze`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "재분석 실패");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown");
    } finally {
      setReanalyzing(false);
    }
  }

  if (loading) return <p className="text-slate-500">불러오는 중…</p>;
  if (error)
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
        {error}
      </div>
    );
  if (!meeting) return null;

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
        <input
          value={meeting.title}
          onChange={(e) => patch((m) => ({ ...m, title: e.target.value }))}
          className="flex-1 px-3 py-2 rounded-md border border-slate-300 focus:border-indigo-500 outline-none font-semibold"
        />
        <button
          onClick={reanalyze}
          disabled={reanalyzing || saving}
          className="px-3 py-2 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-800 text-sm disabled:opacity-50"
        >
          {reanalyzing ? "재분석 중…" : "🔄 AI 재분석"}
        </button>
        <button
          onClick={() => save()}
          disabled={saving || reanalyzing}
          className="px-3 py-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm disabled:opacity-50"
        >
          {saving ? "저장 중…" : "💾 임시 저장"}
        </button>
        <button
          onClick={() => save({ andFinalize: true })}
          disabled={saving || reanalyzing}
          className="px-3 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-sm disabled:opacity-50"
        >
          ✅ 확정 + 다운로드
        </button>
      </div>

      {savedAt && (
        <p className="text-xs text-emerald-600">✓ {savedAt} 저장됨</p>
      )}
      {meeting.status === "analyzing" && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
          ⏳ 아직 분석 중이에요. 새로고침하거나 잠시 기다려 주세요.
        </div>
      )}
      {meeting.analyze_error && meeting.status === "failed" && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          분석 실패: {meeting.analyze_error}
          <br />
          <button onClick={reanalyze} className="mt-2 underline">
            다시 시도
          </button>
        </div>
      )}

      {/* 한 줄 결론 */}
      <Section title="🎯 한 줄 결론">
        <textarea
          value={meeting.executive_summary || ""}
          onChange={(e) => patch((m) => ({ ...m, executive_summary: e.target.value }))}
          rows={2}
          className="w-full px-3 py-2 rounded-md border border-slate-300 focus:border-indigo-500 outline-none"
        />
      </Section>

      {/* 참석자 매핑 */}
      <Section title="👥 참석자 매핑">
        <div className="space-y-2">
          {meeting.participants.map((p, i) => (
            <div key={p.id} className="flex gap-2 items-center text-sm">
              <span className="w-24 text-slate-500">{p.raw_label}</span>
              <input
                placeholder="이름 (예: 박성우)"
                value={p.name || ""}
                onChange={(e) =>
                  patch((m) => {
                    const arr = [...m.participants];
                    arr[i] = { ...arr[i], name: e.target.value };
                    return { ...m, participants: arr };
                  })
                }
                className="flex-1 px-2 py-1.5 rounded border border-slate-300"
              />
              <input
                placeholder="직책/소속"
                value={p.role || ""}
                onChange={(e) =>
                  patch((m) => {
                    const arr = [...m.participants];
                    arr[i] = { ...arr[i], role: e.target.value };
                    return { ...m, participants: arr };
                  })
                }
                className="w-40 px-2 py-1.5 rounded border border-slate-300"
              />
              <span className="text-xs text-slate-400 w-16 text-right">
                {p.utterance_count}회 발화
              </span>
              <button
                onClick={() =>
                  patch((m) => ({
                    ...m,
                    participants: m.participants.filter((_, idx) => idx !== i),
                  }))
                }
                className="text-red-500 px-1"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </Section>

      {/* 결정사항 */}
      <Section title="✅ 핵심 결정사항">
        <div className="space-y-3">
          {meeting.decisions.map((d, i) => (
            <div key={d.id} className="border border-slate-200 rounded-md p-3 space-y-2">
              <div className="flex gap-2">
                <input
                  placeholder="결정 제목"
                  value={d.title}
                  onChange={(e) =>
                    patch((m) => {
                      const arr = [...m.decisions];
                      arr[i] = { ...arr[i], title: e.target.value };
                      return { ...m, decisions: arr };
                    })
                  }
                  className="flex-1 px-2 py-1.5 rounded border border-slate-300 font-medium"
                />
                <input
                  placeholder="MM:SS"
                  value={d.source_timestamp || ""}
                  onChange={(e) =>
                    patch((m) => {
                      const arr = [...m.decisions];
                      arr[i] = { ...arr[i], source_timestamp: e.target.value };
                      return { ...m, decisions: arr };
                    })
                  }
                  className="w-20 px-2 py-1.5 rounded border border-slate-300 text-xs text-center"
                />
                <button
                  onClick={() =>
                    patch((m) => ({
                      ...m,
                      decisions: m.decisions.filter((_, idx) => idx !== i),
                    }))
                  }
                  className="text-red-500 px-2"
                >
                  ×
                </button>
              </div>
              <textarea
                placeholder="상세 (배경·합의 내용)"
                value={d.description || ""}
                onChange={(e) =>
                  patch((m) => {
                    const arr = [...m.decisions];
                    arr[i] = { ...arr[i], description: e.target.value };
                    return { ...m, decisions: arr };
                  })
                }
                rows={2}
                className="w-full px-2 py-1.5 rounded border border-slate-300 text-sm"
              />
            </div>
          ))}
          <button
            onClick={() =>
              patch((m) => ({
                ...m,
                decisions: [
                  ...m.decisions,
                  {
                    id: newId(),
                    title: "",
                    description: "",
                    category: null,
                    rationale: null,
                    source_timestamp: null,
                    order_idx: m.decisions.length,
                  } as Decision,
                ],
              }))
            }
            className="text-sm text-indigo-600 hover:underline"
          >
            + 결정사항 추가
          </button>
        </div>
      </Section>

      {/* 본문 섹션 */}
      <Section title="📋 논의 내용">
        <div className="space-y-3">
          {meeting.sections.map((s, i) => (
            <div key={s.id} className="border border-slate-200 rounded-md p-3 space-y-2">
              <div className="flex gap-2">
                <input
                  placeholder="섹션 제목"
                  value={s.title}
                  onChange={(e) =>
                    patch((m) => {
                      const arr = [...m.sections];
                      arr[i] = { ...arr[i], title: e.target.value };
                      return { ...m, sections: arr };
                    })
                  }
                  className="flex-1 px-2 py-1.5 rounded border border-slate-300 font-medium"
                />
                <button
                  onClick={() =>
                    patch((m) => ({
                      ...m,
                      sections: m.sections.filter((_, idx) => idx !== i),
                    }))
                  }
                  className="text-red-500 px-2"
                >
                  ×
                </button>
              </div>
              <textarea
                placeholder="불릿 포인트 — 한 줄에 하나씩"
                value={s.bullets.join("\n")}
                onChange={(e) =>
                  patch((m) => {
                    const arr = [...m.sections];
                    arr[i] = {
                      ...arr[i],
                      bullets: e.target.value.split("\n").filter((x) => x.trim()),
                    };
                    return { ...m, sections: arr };
                  })
                }
                rows={Math.max(3, s.bullets.length + 1)}
                className="w-full px-2 py-1.5 rounded border border-slate-300 text-sm font-mono"
              />
            </div>
          ))}
          <button
            onClick={() =>
              patch((m) => ({
                ...m,
                sections: [
                  ...m.sections,
                  {
                    id: newId(),
                    title: "",
                    bullets: [],
                    order_idx: m.sections.length,
                  } as Section,
                ],
              }))
            }
            className="text-sm text-indigo-600 hover:underline"
          >
            + 섹션 추가
          </button>
        </div>
      </Section>

      {/* 액션 아이템 */}
      <Section title="🎬 액션 아이템">
        <div className="space-y-2">
          {meeting.action_items.map((a, i) => (
            <div
              key={a.id}
              className="flex flex-wrap gap-2 items-center border border-slate-200 rounded-md p-2"
            >
              <input
                placeholder="할 일"
                value={a.title}
                onChange={(e) =>
                  patch((m) => {
                    const arr = [...m.action_items];
                    arr[i] = { ...arr[i], title: e.target.value };
                    return { ...m, action_items: arr };
                  })
                }
                className="flex-1 min-w-[200px] px-2 py-1.5 rounded border border-slate-300 text-sm"
              />
              <input
                placeholder="담당자"
                value={a.owner_name || ""}
                onChange={(e) =>
                  patch((m) => {
                    const arr = [...m.action_items];
                    arr[i] = { ...arr[i], owner_name: e.target.value };
                    return { ...m, action_items: arr };
                  })
                }
                className="w-28 px-2 py-1.5 rounded border border-slate-300 text-sm"
              />
              <input
                type="date"
                value={a.due_date || ""}
                onChange={(e) =>
                  patch((m) => {
                    const arr = [...m.action_items];
                    arr[i] = { ...arr[i], due_date: e.target.value || null };
                    return { ...m, action_items: arr };
                  })
                }
                className="w-36 px-2 py-1.5 rounded border border-slate-300 text-sm"
              />
              <select
                value={a.priority}
                onChange={(e) =>
                  patch((m) => {
                    const arr = [...m.action_items];
                    arr[i] = { ...arr[i], priority: e.target.value as Priority };
                    return { ...m, action_items: arr };
                  })
                }
                className="px-2 py-1.5 rounded border border-slate-300 text-sm"
              >
                {PRIORITY_OPT.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABEL[p]}
                  </option>
                ))}
              </select>
              <button
                onClick={() =>
                  patch((m) => ({
                    ...m,
                    action_items: m.action_items.filter((_, idx) => idx !== i),
                  }))
                }
                className="text-red-500 px-1"
              >
                ×
              </button>
            </div>
          ))}
          <button
            onClick={() =>
              patch((m) => ({
                ...m,
                action_items: [
                  ...m.action_items,
                  {
                    id: newId(),
                    title: "",
                    description: null,
                    owner_name: null,
                    due_date: null,
                    priority: "medium",
                    status: "pending",
                    source_timestamp: null,
                    order_idx: m.action_items.length,
                  } as ActionItem,
                ],
              }))
            }
            className="text-sm text-indigo-600 hover:underline"
          >
            + 액션 아이템 추가
          </button>
        </div>
      </Section>

      {/* 리스크 */}
      <Section title="⚠️ 리스크 / 이슈">
        <div className="space-y-2">
          {meeting.risks.map((r, i) => (
            <div key={r.id} className="border border-slate-200 rounded-md p-2 space-y-2">
              <div className="flex gap-2">
                <input
                  placeholder="리스크 제목"
                  value={r.title}
                  onChange={(e) =>
                    patch((m) => {
                      const arr = [...m.risks];
                      arr[i] = { ...arr[i], title: e.target.value };
                      return { ...m, risks: arr };
                    })
                  }
                  className="flex-1 px-2 py-1.5 rounded border border-slate-300 text-sm font-medium"
                />
                <select
                  value={r.severity}
                  onChange={(e) =>
                    patch((m) => {
                      const arr = [...m.risks];
                      arr[i] = { ...arr[i], severity: e.target.value as Priority };
                      return { ...m, risks: arr };
                    })
                  }
                  className="px-2 py-1.5 rounded border border-slate-300 text-sm"
                >
                  {PRIORITY_OPT.map((p) => (
                    <option key={p} value={p}>
                      {PRIORITY_LABEL[p]}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() =>
                    patch((m) => ({
                      ...m,
                      risks: m.risks.filter((_, idx) => idx !== i),
                    }))
                  }
                  className="text-red-500 px-2"
                >
                  ×
                </button>
              </div>
              <textarea
                placeholder="설명"
                value={r.description || ""}
                onChange={(e) =>
                  patch((m) => {
                    const arr = [...m.risks];
                    arr[i] = { ...arr[i], description: e.target.value };
                    return { ...m, risks: arr };
                  })
                }
                rows={2}
                className="w-full px-2 py-1.5 rounded border border-slate-300 text-sm"
              />
              <input
                placeholder="완화 방안 (선택)"
                value={r.mitigation || ""}
                onChange={(e) =>
                  patch((m) => {
                    const arr = [...m.risks];
                    arr[i] = { ...arr[i], mitigation: e.target.value };
                    return { ...m, risks: arr };
                  })
                }
                className="w-full px-2 py-1.5 rounded border border-slate-300 text-sm"
              />
            </div>
          ))}
          <button
            onClick={() =>
              patch((m) => ({
                ...m,
                risks: [
                  ...m.risks,
                  {
                    id: newId(),
                    title: "",
                    description: "",
                    severity: "medium",
                    mitigation: null,
                    order_idx: m.risks.length,
                  } as Risk,
                ],
              }))
            }
            className="text-sm text-indigo-600 hover:underline"
          >
            + 리스크 추가
          </button>
        </div>
      </Section>

      {/* 다음 안건 */}
      <Section title="📌 다음 안건">
        <textarea
          value={meeting.next_agenda.join("\n")}
          onChange={(e) =>
            patch((m) => ({
              ...m,
              next_agenda: e.target.value.split("\n").filter((x) => x.trim()),
            }))
          }
          rows={4}
          placeholder="한 줄에 하나씩"
          className="w-full px-3 py-2 rounded-md border border-slate-300 focus:border-indigo-500 outline-none font-mono text-sm"
        />
      </Section>

      <div className="flex gap-2 pt-4 border-t">
        <button
          onClick={() => save()}
          disabled={saving}
          className="px-4 py-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm"
        >
          💾 임시 저장
        </button>
        <button
          onClick={() => save({ andFinalize: true })}
          disabled={saving}
          className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium"
        >
          ✅ 확정 + .docx 다운로드
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h2 className="text-sm font-bold text-slate-800 mb-3">{title}</h2>
      {children}
    </div>
  );
}
