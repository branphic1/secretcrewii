"use client";

import { useEffect, useState } from "react";
import type { DeckProfile, DeckPerson } from "@/lib/deck/types";

export default function DeckProfilePage() {
  const [p, setP] = useState<DeckProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/deck/profile", { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.ok) setP(data.profile);
      else setError(data.error || "불러오기 실패");
      setLoading(false);
    })();
  }, []);

  async function save() {
    if (!p) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/deck/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(p),
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

  if (loading) return <p className="text-slate-500">불러오는 중…</p>;
  if (!p) return <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">⚙ 프로필</h1>
        <p className="text-sm text-slate-500">PPT/Word 표지·강조색·자주 등장하는 인물 등을 커스텀합니다.</p>
      </div>

      <Section title="🏢 회사·브랜드">
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-slate-700 mb-1">회사명 / 브랜드명</label>
            <input
              value={p.company_name || ""} onChange={(e) => setP({ ...p, company_name: e.target.value })}
              placeholder="예: 우리회사 (비워두면 표시 안됨)"
              className="w-full px-3 py-2 rounded-md border border-slate-300"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-700 mb-1">로고 URL (선택)</label>
            <input
              value={p.logo_url || ""} onChange={(e) => setP({ ...p, logo_url: e.target.value })}
              placeholder="https://..."
              className="w-full px-3 py-2 rounded-md border border-slate-300 font-mono text-xs"
            />
          </div>
        </div>
      </Section>

      <Section title="🎨 강조색 2종">
        <div className="flex gap-4">
          <ColorPicker
            label="강조색 1 (★ 인용·핵심 명제)"
            value={p.accent1_hex}
            onChange={(v) => setP({ ...p, accent1_hex: v })}
          />
          <ColorPicker
            label="강조색 2 (보조 강조)"
            value={p.accent2_hex}
            onChange={(v) => setP({ ...p, accent2_hex: v })}
          />
        </div>
      </Section>

      <Section title="🏷 자주 다루는 카테고리">
        <textarea
          value={p.default_categories.join("\n")}
          onChange={(e) => setP({ ...p, default_categories: e.target.value.split("\n").filter(s => s.trim()) })}
          rows={5}
          placeholder="한 줄에 하나씩"
          className="w-full px-3 py-2 rounded-md border border-slate-300 font-mono text-sm"
        />
      </Section>

      <Section title="👥 자주 등장하는 인물">
        <p className="text-xs text-slate-500 mb-2">AI가 화자 매핑 시 참고합니다 (자동 매핑은 100% 보장 안 됨, 검토 화면에서 최종 수정).</p>
        {p.default_people.map((person, i) => (
          <PersonRow key={i} person={person}
            onChange={(np) => {
              const arr = [...p.default_people]; arr[i] = np;
              setP({ ...p, default_people: arr });
            }}
            onRemove={() => setP({ ...p, default_people: p.default_people.filter((_, k) => k !== i) })}
          />
        ))}
        <button
          onClick={() => setP({ ...p, default_people: [...p.default_people, { rawLabel: "", name: "", role: "" }] })}
          className="text-sm text-indigo-600 hover:underline">
          + 인물 추가
        </button>
      </Section>

      <Section title="📚 사내·도메인 고유어 (오인식 보정)">
        <p className="text-xs text-slate-500 mb-2">예: 회사 제품명·약어·해외 파트너사 — 클로바노트 오인식 시 AI가 참고합니다.</p>
        <textarea
          value={p.vocabulary.join("\n")}
          onChange={(e) => setP({ ...p, vocabulary: e.target.value.split("\n").filter(s => s.trim()) })}
          rows={6}
          placeholder="한 줄에 하나씩"
          className="w-full px-3 py-2 rounded-md border border-slate-300 font-mono text-sm"
        />
      </Section>

      <div className="flex gap-2 pt-2">
        <button onClick={save} disabled={saving}
          className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm disabled:opacity-50">
          {saving ? "저장 중…" : "💾 프로필 저장"}
        </button>
        <a href="/deck" className="px-4 py-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm">← 목록</a>
        {savedAt && <span className="text-xs text-emerald-600 self-center">✓ {savedAt} 저장됨</span>}
        {error && <span className="text-xs text-red-600 self-center">{error}</span>}
      </div>
    </div>
  );
}

function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex-1">
      <label className="block text-xs text-slate-700 mb-1">{label}</label>
      <div className="flex gap-2 items-center">
        <input
          type="color" value={`#${value}`}
          onChange={(e) => onChange(e.target.value.replace("#", "").toUpperCase())}
          className="w-12 h-10 rounded border border-slate-300"
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/^#/, "").toUpperCase())}
          maxLength={6}
          className="flex-1 px-2 py-1.5 rounded border border-slate-300 font-mono text-sm uppercase"
        />
      </div>
    </div>
  );
}

function PersonRow({ person, onChange, onRemove }: {
  person: DeckPerson;
  onChange: (p: DeckPerson) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex gap-2 mb-2 items-center">
      <input
        placeholder="원본 라벨 (참석자 1)" value={person.rawLabel}
        onChange={(e) => onChange({ ...person, rawLabel: e.target.value })}
        className="w-32 px-2 py-1.5 rounded border border-slate-300 text-sm"
      />
      <input
        placeholder="이름" value={person.name}
        onChange={(e) => onChange({ ...person, name: e.target.value })}
        className="w-32 px-2 py-1.5 rounded border border-slate-300 text-sm"
      />
      <input
        placeholder="역할" value={person.role || ""}
        onChange={(e) => onChange({ ...person, role: e.target.value })}
        className="flex-1 px-2 py-1.5 rounded border border-slate-300 text-sm"
      />
      <select
        value={person.accent || ""}
        onChange={(e) => onChange({ ...person, accent: (e.target.value || null) as DeckPerson["accent"] })}
        className="px-2 py-1.5 rounded border border-slate-300 text-sm"
      >
        <option value="">색 없음</option>
        <option value="accent1">강조색 1</option>
        <option value="accent2">강조색 2</option>
      </select>
      <button onClick={onRemove} className="text-red-500 px-2">×</button>
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
