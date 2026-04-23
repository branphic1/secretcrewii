import { useState } from 'react';
import { X } from 'lucide-react';
import { todayStr } from '@/lib/time-ledger/dates.js';

const TYPE_OPTS = [
  { v: 'deadline', label: '데드라인 (특정 일자에 처리)' },
  { v: 'recurring', label: '주기 (정기적 점검/실행)' },
  { v: 'incident', label: '이슈 (사후 기록)' },
];
const FREQ_OPTS = [
  { v: 'weekly', label: '주간' },
  { v: 'monthly', label: '월간' },
  { v: 'quarterly', label: '분기' },
  { v: 'yearly', label: '연간' },
];
const SEV_OPTS = [
  { v: 'low', label: '낮음' },
  { v: 'medium', label: '보통' },
  { v: 'high', label: '높음' },
  { v: 'critical', label: '치명' },
];
const STATUS_OPTS = [
  { v: 'pending', label: '대기' },
  { v: 'in-progress', label: '진행중' },
  { v: 'done', label: '완료' },
  { v: 'missed', label: '놓침' },
  { v: 'dismissed', label: '무시' },
];

export default function BlindSpotForm({ initial, blindspotCategories, timeCategories, onCancel, onSave, onDelete }) {
  const today = todayStr();
  const [form, setForm] = useState({
    id: initial?.id,
    title: initial?.title || '',
    type: initial?.type || 'deadline',
    category: initial?.category || blindspotCategories[0]?.name || '기타',
    dueDate: initial?.dueDate || (initial?.type === 'deadline' ? today : ''),
    recurrence: initial?.recurrence || { frequency: 'monthly', anchor: today },
    description: initial?.description || '',
    severity: initial?.severity || 'medium',
    status: initial?.status || 'pending',
    occurredDate: initial?.occurredDate || (initial?.type === 'incident' ? today : ''),
    lessonLearned: initial?.lessonLearned || '',
    relatedCategoryIds: initial?.relatedCategoryIds || [],
  });

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const payload = {
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      lessonLearned: form.lessonLearned.trim() || undefined,
      dueDate: form.type === 'deadline' ? form.dueDate || undefined : form.dueDate || undefined,
      recurrence: form.type === 'recurring' ? form.recurrence : undefined,
      occurredDate: form.type === 'incident' ? form.occurredDate : undefined,
    };
    onSave(payload);
  };

  const toggleCat = (id) => {
    set({
      relatedCategoryIds: form.relatedCategoryIds.includes(id)
        ? form.relatedCategoryIds.filter((x) => x !== id)
        : [...form.relatedCategoryIds, id],
    });
  };

  return (
    <div
      className="fixed inset-0 flex items-start justify-center p-4 overflow-y-auto z-40"
      style={{ background: 'rgba(28,25,23,0.35)' }}
      onClick={onCancel}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="rounded-lg w-full max-w-xl my-8 fade-in"
        style={{ background: '#FFFBF3', border: '1px solid #EFE7D4' }}
      >
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: '1px solid #EFE7D4' }}
        >
          <h3 className="display italic text-lg" style={{ color: '#2B2620' }}>
            {form.id ? '항목 편집' : '새 블라인드 스팟'}
          </h3>
          <button type="button" onClick={onCancel} className="p-1 rounded hover:bg-stone-100" style={{ color: '#8A7F73' }}>
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs block mb-1" style={{ color: '#8A7F73' }}>제목</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set({ title: e.target.value })}
              autoFocus
              className="w-full rounded-md px-3 py-2 text-sm outline-none"
              style={{ border: '1px solid #EFE7D4', background: '#fff' }}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs block mb-1" style={{ color: '#8A7F73' }}>유형</label>
              <select
                value={form.type}
                onChange={(e) => set({ type: e.target.value })}
                className="w-full rounded-md px-3 py-2 text-sm outline-none"
                style={{ border: '1px solid #EFE7D4', background: '#fff' }}
              >
                {TYPE_OPTS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: '#8A7F73' }}>카테고리</label>
              <select
                value={form.category}
                onChange={(e) => set({ category: e.target.value })}
                className="w-full rounded-md px-3 py-2 text-sm outline-none"
                style={{ border: '1px solid #EFE7D4', background: '#fff' }}
              >
                {blindspotCategories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {form.type === 'deadline' && (
            <div>
              <label className="text-xs block mb-1" style={{ color: '#8A7F73' }}>기한</label>
              <input
                type="date"
                value={form.dueDate || ''}
                onChange={(e) => set({ dueDate: e.target.value })}
                className="rounded-md px-3 py-2 text-sm outline-none"
                style={{ border: '1px solid #EFE7D4', background: '#fff' }}
              />
            </div>
          )}

          {form.type === 'recurring' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs block mb-1" style={{ color: '#8A7F73' }}>주기</label>
                <select
                  value={form.recurrence.frequency}
                  onChange={(e) => set({ recurrence: { ...form.recurrence, frequency: e.target.value } })}
                  className="w-full rounded-md px-3 py-2 text-sm outline-none"
                  style={{ border: '1px solid #EFE7D4', background: '#fff' }}
                >
                  {FREQ_OPTS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: '#8A7F73' }}>기준일</label>
                <input
                  type="date"
                  value={form.recurrence.anchor || ''}
                  onChange={(e) => set({
                    recurrence: { ...form.recurrence, anchor: e.target.value },
                    dueDate: e.target.value,
                  })}
                  className="w-full rounded-md px-3 py-2 text-sm outline-none"
                  style={{ border: '1px solid #EFE7D4', background: '#fff' }}
                />
              </div>
            </div>
          )}

          {form.type === 'incident' && (
            <>
              <div>
                <label className="text-xs block mb-1" style={{ color: '#8A7F73' }}>놓친 시점</label>
                <input
                  type="date"
                  value={form.occurredDate || ''}
                  onChange={(e) => set({ occurredDate: e.target.value })}
                  className="rounded-md px-3 py-2 text-sm outline-none"
                  style={{ border: '1px solid #EFE7D4', background: '#fff' }}
                />
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: '#8A7F73' }}>재발 방지 메모 (lesson learned)</label>
                <textarea
                  rows={2}
                  value={form.lessonLearned}
                  onChange={(e) => set({ lessonLearned: e.target.value })}
                  className="w-full rounded-md px-3 py-2 text-sm outline-none resize-none"
                  style={{ border: '1px solid #EFE7D4', background: '#fff' }}
                />
              </div>
            </>
          )}

          <div>
            <label className="text-xs block mb-1" style={{ color: '#8A7F73' }}>상세 설명</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
              className="w-full rounded-md px-3 py-2 text-sm outline-none resize-none"
              style={{ border: '1px solid #EFE7D4', background: '#fff' }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs block mb-1" style={{ color: '#8A7F73' }}>심각도</label>
              <select
                value={form.severity}
                onChange={(e) => set({ severity: e.target.value })}
                className="w-full rounded-md px-3 py-2 text-sm outline-none"
                style={{ border: '1px solid #EFE7D4', background: '#fff' }}
              >
                {SEV_OPTS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: '#8A7F73' }}>상태</label>
              <select
                value={form.status}
                onChange={(e) => set({ status: e.target.value })}
                className="w-full rounded-md px-3 py-2 text-sm outline-none"
                style={{ border: '1px solid #EFE7D4', background: '#fff' }}
              >
                {STATUS_OPTS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs block mb-1.5" style={{ color: '#8A7F73' }}>
              연결된 Time Ledger 카테고리 (선택)
            </label>
            <div className="flex flex-wrap gap-1">
              {timeCategories.map((c) => {
                const on = form.relatedCategoryIds.includes(c.id);
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => toggleCat(c.id)}
                    className="px-2 py-1 text-xs rounded-full transition"
                    style={{
                      background: on ? c.color : 'transparent',
                      color: on ? '#FFFBF3' : '#57534E',
                      border: `1px solid ${on ? c.color : '#EFE7D4'}`,
                    }}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderTop: '1px solid #EFE7D4' }}
        >
          <div>
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="text-sm px-3 py-1.5 rounded-md transition"
                style={{ color: '#C85450', border: '1px solid #EFE7D4' }}
              >
                삭제
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="text-sm px-3 py-1.5 rounded-md transition"
              style={{ color: '#57534E', border: '1px solid #EFE7D4' }}
            >
              취소
            </button>
            <button
              type="submit"
              className="text-sm px-3 py-1.5 rounded-md transition"
              style={{ background: '#2B2620', color: '#FFFBF3' }}
            >
              저장
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
