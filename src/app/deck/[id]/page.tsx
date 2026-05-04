"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Deck, ExtractedContent } from "@/lib/deck/types";

export default function DeckReviewPage() {
  const params = useParams();
  const id = params?.id as string;

  const [deck, setDeck] = useState<Deck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [reanalyzing, setReanalyzing] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/deck/decks/${id}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "불러오기 실패");
      setDeck(data.deck);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { if (id) load(); }, [id]);

  function patchEx(updater: (ex: ExtractedContent) => ExtractedContent) {
    setDeck((prev) => {
      if (!prev?.extracted) return prev;
      return { ...prev, extracted: updater(prev.extracted) };
    });
  }

  async function save() {
    if (!deck) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/deck/decks/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: deck.title,
          extracted: deck.extracted,
          status: "reviewing",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "저장 실패");
      setSavedAt(new Date().toLocaleTimeString("ko-KR"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown");
    } finally {
      setSaving(false);
    }
  }

  async function reanalyze() {
    if (!confirm("AI 재분석할까요? 현재 편집한 내용은 사라집니다.")) return;
    setReanalyzing(true);
    setError(null);
    try {
      const res = await fetch(`/api/deck/decks/${id}/extract`, { method: "POST" });
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
  if (error) return <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>;
  if (!deck) return null;
  const ex = deck.extracted;
  const hasContent = !!ex && (ex.bestQuotes.length > 0 || ex.timelineMarkers.length > 0 || ex.dataPoints.length > 0 || (ex.executiveSummary?.trim().length ?? 0) > 0);

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
        <input
          value={deck.title}
          onChange={(e) => setDeck({ ...deck, title: e.target.value })}
          className="flex-1 px-3 py-2 rounded-md border border-slate-300 focus:border-indigo-500 outline-none font-semibold"
        />
        <button onClick={reanalyze} disabled={reanalyzing || saving}
          className="px-3 py-2 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-800 text-sm disabled:opacity-50">
          {reanalyzing ? "재분석 중…" : "🔄 AI 재분석"}
        </button>
        <button onClick={save} disabled={saving || reanalyzing}
          className="px-3 py-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm disabled:opacity-50">
          {saving ? "저장 중…" : "💾 저장"}
        </button>
        <a
          href={hasContent ? `/api/deck/decks/${id}/pptx` : undefined}
          onClick={(e) => { if (!hasContent) e.preventDefault(); }}
          className={`px-3 py-2 rounded-md text-white text-sm ${hasContent ? "bg-indigo-600 hover:bg-indigo-500" : "bg-slate-300 cursor-not-allowed"}`}>
          📊 .pptx
        </a>
        <a
          href={hasContent ? `/api/deck/decks/${id}/docx` : undefined}
          onClick={(e) => { if (!hasContent) e.preventDefault(); }}
          className={`px-3 py-2 rounded-md text-white text-sm ${hasContent ? "bg-emerald-600 hover:bg-emerald-500" : "bg-slate-300 cursor-not-allowed"}`}>
          📄 .docx
        </a>
      </div>

      {savedAt && <p className="text-xs text-emerald-600">✓ {savedAt} 저장됨</p>}

      {!hasContent && deck.status !== "extracting" && (
        <div className="rounded-lg bg-amber-50 border-2 border-amber-300 p-4 text-sm">
          <p className="font-semibold text-amber-900 mb-1">⚠️ 추출 결과 없음</p>
          <p className="text-amber-800">상단 <span className="font-mono bg-amber-100 px-1">🔄 AI 재분석</span> 버튼을 눌러 분석을 시작해 주세요.</p>
        </div>
      )}
      {deck.status === "failed" && deck.error_message && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          분석 실패: {deck.error_message}
        </div>
      )}

      {ex && (
        <>
          {/* 핵심 명제 */}
          <Section title="🎯 핵심 명제">
            <textarea
              value={ex.coreThesis.text}
              onChange={(e) => patchEx((x) => ({ ...x, coreThesis: { ...x.coreThesis, text: e.target.value } }))}
              rows={2}
              className="w-full px-3 py-2 rounded-md border border-slate-300 outline-none mb-2 font-medium"
            />
            <div className="flex gap-2 text-sm">
              <input
                placeholder="발화자" value={ex.coreThesis.speaker}
                onChange={(e) => patchEx((x) => ({ ...x, coreThesis: { ...x.coreThesis, speaker: e.target.value } }))}
                className="px-2 py-1.5 rounded border border-slate-300 w-40"
              />
              <input
                placeholder="MM:SS" value={ex.coreThesis.timestamp}
                onChange={(e) => patchEx((x) => ({ ...x, coreThesis: { ...x.coreThesis, timestamp: e.target.value } }))}
                className="px-2 py-1.5 rounded border border-slate-300 w-24"
              />
            </div>
          </Section>

          <Section title="📌 한 줄 요약">
            <textarea
              value={ex.executiveSummary}
              onChange={(e) => patchEx((x) => ({ ...x, executiveSummary: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 rounded-md border border-slate-300 outline-none"
            />
          </Section>

          {/* 참석자 */}
          <Section title="👥 참석자">
            {ex.participants.map((p, i) => (
              <div key={i} className="flex gap-2 items-center text-sm mb-2">
                <span className="w-24 text-slate-500">{p.rawLabel}</span>
                <input
                  placeholder="이름" value={p.inferredName || ""}
                  onChange={(e) => patchEx((x) => {
                    const arr = [...x.participants];
                    arr[i] = { ...arr[i], inferredName: e.target.value };
                    return { ...x, participants: arr };
                  })}
                  className="flex-1 px-2 py-1.5 rounded border border-slate-300"
                />
                <input
                  placeholder="역할" value={p.inferredRole || ""}
                  onChange={(e) => patchEx((x) => {
                    const arr = [...x.participants];
                    arr[i] = { ...arr[i], inferredRole: e.target.value };
                    return { ...x, participants: arr };
                  })}
                  className="w-40 px-2 py-1.5 rounded border border-slate-300"
                />
                <span className="text-xs text-slate-400 w-16 text-right">{p.utteranceCount}회</span>
              </div>
            ))}
          </Section>

          {/* BEST 인용 */}
          <Section title={`💬 BEST 인용 (${ex.bestQuotes.length}개)`}>
            <p className="text-xs text-slate-500 mb-2">★ 표시한 인용은 PPT 에서 강조색(accent1)으로 부각됩니다.</p>
            {ex.bestQuotes.map((q, i) => (
              <div key={i} className="border border-slate-200 rounded-md p-2 mb-2 space-y-1">
                <div className="flex gap-2 text-xs">
                  <button
                    onClick={() => patchEx((x) => {
                      const arr = [...x.bestQuotes];
                      arr[i] = { ...arr[i], starred: !arr[i].starred };
                      return { ...x, bestQuotes: arr };
                    })}
                    className={`px-2 py-1 rounded ${q.starred ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-500"}`}>
                    {q.starred ? "★ 표시됨" : "☆ 일반"}
                  </button>
                  <input
                    placeholder="발화자" value={q.speaker}
                    onChange={(e) => patchEx((x) => {
                      const arr = [...x.bestQuotes]; arr[i] = { ...arr[i], speaker: e.target.value };
                      return { ...x, bestQuotes: arr };
                    })}
                    className="px-2 py-1 rounded border border-slate-300 w-32"
                  />
                  <input
                    placeholder="MM:SS" value={q.timestamp}
                    onChange={(e) => patchEx((x) => {
                      const arr = [...x.bestQuotes]; arr[i] = { ...arr[i], timestamp: e.target.value };
                      return { ...x, bestQuotes: arr };
                    })}
                    className="px-2 py-1 rounded border border-slate-300 w-20"
                  />
                  <button
                    onClick={() => patchEx((x) => ({ ...x, bestQuotes: x.bestQuotes.filter((_, k) => k !== i) }))}
                    className="ml-auto text-red-500 px-2">×</button>
                </div>
                <textarea
                  value={q.text}
                  onChange={(e) => patchEx((x) => {
                    const arr = [...x.bestQuotes]; arr[i] = { ...arr[i], text: e.target.value };
                    return { ...x, bestQuotes: arr };
                  })}
                  rows={2}
                  className="w-full px-2 py-1.5 rounded border border-slate-300 text-sm"
                />
              </div>
            ))}
          </Section>

          {/* 데이터 포인트 */}
          <Section title={`📊 데이터 카탈로그 (${ex.dataPoints.length}개)`}>
            {ex.dataPoints.map((d, i) => (
              <div key={i} className="flex flex-wrap gap-2 mb-2 items-center">
                <input
                  placeholder="수치" value={d.value}
                  onChange={(e) => patchEx((x) => {
                    const arr = [...x.dataPoints]; arr[i] = { ...arr[i], value: e.target.value };
                    return { ...x, dataPoints: arr };
                  })}
                  className="w-24 px-2 py-1.5 rounded border border-slate-300 text-sm" />
                <input
                  placeholder="단위" value={d.unit}
                  onChange={(e) => patchEx((x) => {
                    const arr = [...x.dataPoints]; arr[i] = { ...arr[i], unit: e.target.value };
                    return { ...x, dataPoints: arr };
                  })}
                  className="w-20 px-2 py-1.5 rounded border border-slate-300 text-sm" />
                <input
                  placeholder="맥락" value={d.context}
                  onChange={(e) => patchEx((x) => {
                    const arr = [...x.dataPoints]; arr[i] = { ...arr[i], context: e.target.value };
                    return { ...x, dataPoints: arr };
                  })}
                  className="flex-1 min-w-[200px] px-2 py-1.5 rounded border border-slate-300 text-sm" />
                <input
                  placeholder="MM:SS" value={d.timestamp || ""}
                  onChange={(e) => patchEx((x) => {
                    const arr = [...x.dataPoints]; arr[i] = { ...arr[i], timestamp: e.target.value };
                    return { ...x, dataPoints: arr };
                  })}
                  className="w-20 px-2 py-1.5 rounded border border-slate-300 text-sm" />
                <button
                  onClick={() => patchEx((x) => ({ ...x, dataPoints: x.dataPoints.filter((_, k) => k !== i) }))}
                  className="text-red-500 px-1">×</button>
              </div>
            ))}
          </Section>

          {/* 액션 아이템 */}
          <Section title={`🎬 액션 아이템 (${ex.actionItems.length}개)`}>
            <textarea
              value={ex.actionItems.join("\n")}
              onChange={(e) => patchEx((x) => ({ ...x, actionItems: e.target.value.split("\n").filter(s => s.trim()) }))}
              rows={Math.max(3, ex.actionItems.length + 1)}
              placeholder="한 줄에 하나씩"
              className="w-full px-3 py-2 rounded-md border border-slate-300 font-mono text-sm"
            />
          </Section>

          {/* 다음 안건 */}
          <Section title={`📌 다음 안건 (${ex.nextAgenda.length}개)`}>
            <textarea
              value={ex.nextAgenda.join("\n")}
              onChange={(e) => patchEx((x) => ({ ...x, nextAgenda: e.target.value.split("\n").filter(s => s.trim()) }))}
              rows={3}
              placeholder="한 줄에 하나씩"
              className="w-full px-3 py-2 rounded-md border border-slate-300 font-mono text-sm"
            />
          </Section>
        </>
      )}
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
