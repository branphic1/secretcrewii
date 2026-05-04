"use client";

import { useState, FormEvent, ChangeEvent, DragEvent } from "react";
import { useRouter } from "next/navigation";

export default function DeckNewPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".txt")) {
      setError(".txt 파일만 가능해요.");
      return;
    }
    setError(null);
    const text = await file.text();
    setTranscript(text);
    if (!title) setTitle(file.name.replace(/\.txt$/i, ""));
  }
  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }
  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setError("회의명을 입력해 주세요.");
    if (!transcript.trim()) return setError("회의록 텍스트가 비어있어요.");

    setLoading(true);
    setError(null);
    try {
      setProgress("덱 생성 중…");
      const r1 = await fetch("/api/deck/decks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          meetingDate: new Date(meetingDate).toISOString(),
          rawTranscript: transcript,
        }),
      });
      const j1 = await r1.json();
      if (!r1.ok || !j1.ok) throw new Error(j1.error || "생성 실패");

      const id = j1.deckId as string;
      setProgress("Claude Opus 4.7 분석 중… (30초~2분)");
      const r2 = await fetch(`/api/deck/decks/${id}/extract`, { method: "POST" });
      const j2 = await r2.json();
      if (!r2.ok || !j2.ok) throw new Error(j2.error || "추출 실패");

      router.push(`/deck/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown");
      setLoading(false);
      setProgress(null);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">새 덱 만들기</h1>
      <p className="text-sm text-slate-500 mb-6">
        클로바노트 .txt 를 올리거나 텍스트를 붙여넣어 주세요. 추출 결과를 검토한 뒤 PPT/Word 로 내려받습니다.
      </p>

      <form onSubmit={onSubmit} className="space-y-4 bg-white rounded-xl border border-slate-200 p-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">회의명 *</label>
          <input
            type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 4월 신제품 기획 회의"
            className="w-full px-3 py-2 rounded-md border border-slate-300 focus:border-indigo-500 outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">회의 일시 *</label>
          <input
            type="datetime-local" value={meetingDate}
            onChange={(e) => setMeetingDate(e.target.value)}
            className="px-3 py-2 rounded-md border border-slate-300 focus:border-indigo-500 outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">회의록 원본 (.txt) *</label>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`rounded-lg border-2 border-dashed p-4 mb-2 text-center text-sm transition ${
              dragOver ? "border-indigo-500 bg-indigo-50" : "border-slate-300 bg-slate-50"
            }`}
          >
            <p className="text-slate-600 mb-2">📂 .txt 파일을 끌어다 놓거나</p>
            <input type="file" accept=".txt,text/plain" onChange={onFileChange} className="text-sm" />
          </div>
          <textarea
            value={transcript} onChange={(e) => setTranscript(e.target.value)}
            placeholder="또는 여기에 직접 붙여넣기…"
            rows={14}
            className="w-full px-3 py-2 rounded-md border border-slate-300 focus:border-indigo-500 outline-none font-mono text-xs"
            required
          />
          <p className="text-xs text-slate-400 mt-1">현재 글자수: {transcript.length.toLocaleString()}</p>
        </div>

        {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">❌ {error}</div>}
        {progress && !error && <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">⏳ {progress}</div>}

        <div className="flex gap-2">
          <button type="submit" disabled={loading}
            className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm">
            {loading ? "분석 중…" : "분석 시작 (Opus 4.7)"}
          </button>
          <a href="/deck" className="px-4 py-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm">취소</a>
        </div>
      </form>
    </div>
  );
}
