import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { uid } from '@/lib/time-ledger/id.js';

const STATUS = [
  { v: 'active', label: '진행중' },
  { v: 'done', label: '달성' },
  { v: 'paused', label: '보류' },
  { v: 'dropped', label: '철회' },
];

const STATUS_COLOR = {
  active: '#4A6FA5',
  done: '#5C8A6E',
  paused: '#8A8A8A',
  dropped: '#C85450',
};

export default function Goals({ goals, categories, onChange }) {
  const [title, setTitle] = useState('');

  const add = () => {
    if (!title.trim()) return;
    onChange([
      ...goals,
      {
        id: uid('goal'),
        title: title.trim(),
        description: '',
        relatedCategoryIds: [],
        progress: 0,
        status: 'active',
      },
    ]);
    setTitle('');
  };

  const update = (id, patch) => {
    onChange(goals.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  };

  const remove = (id) => {
    if (!window.confirm('이 목표를 삭제할까요?')) return;
    onChange(goals.filter((g) => g.id !== id));
  };

  const toggleCat = (goal, catId) => {
    const has = goal.relatedCategoryIds.includes(catId);
    update(goal.id, {
      relatedCategoryIds: has
        ? goal.relatedCategoryIds.filter((x) => x !== catId)
        : [...goal.relatedCategoryIds, catId],
    });
  };

  return (
    <div className="space-y-3">
      {goals.length === 0 && (
        <div
          className="text-center text-sm py-8 rounded-lg"
          style={{ color: '#A8A29E', background: '#FFFDF6', border: '1px dashed #EFE7D4' }}
        >
          아직 등록된 목표가 없습니다. 올해의 북극성 3~5개를 설정해보세요.
        </div>
      )}

      {goals.map((g) => (
        <div
          key={g.id}
          className="rounded-lg p-4"
          style={{ background: '#FFFDF6', border: '1px solid #EFE7D4' }}
        >
          <div className="flex items-start gap-2">
            <span
              className="mt-1.5 shrink-0 rounded-full"
              style={{ width: 8, height: 8, background: STATUS_COLOR[g.status] }}
            />
            <input
              type="text"
              value={g.title}
              onChange={(e) => update(g.id, { title: e.target.value })}
              className="flex-1 bg-transparent text-base font-medium outline-none"
              style={{ color: '#2B2620' }}
            />
            <select
              value={g.status}
              onChange={(e) => update(g.id, { status: e.target.value })}
              className="text-xs rounded-md px-2 py-1 outline-none"
              style={{ border: '1px solid #EFE7D4', background: '#fff', color: '#57534E' }}
            >
              {STATUS.map((s) => (
                <option key={s.v} value={s.v}>{s.label}</option>
              ))}
            </select>
            <button
              onClick={() => remove(g.id)}
              className="p-1 rounded transition hover:bg-stone-100"
              style={{ color: '#C85450' }}
              aria-label="삭제"
            >
              <Trash2 size={14} />
            </button>
          </div>

          <textarea
            placeholder="상세 설명"
            value={g.description}
            onChange={(e) => update(g.id, { description: e.target.value })}
            rows={2}
            className="mt-3 w-full rounded-md px-3 py-2 text-sm outline-none resize-none"
            style={{ border: '1px solid #F3EDE1', background: '#FFFBF3', color: '#2B2620' }}
          />

          <div className="mt-3">
            <div className="text-xs mb-1.5" style={{ color: '#8A7F73' }}>관련 카테고리</div>
            <div className="flex flex-wrap gap-1">
              {categories.map((c) => {
                const on = g.relatedCategoryIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleCat(g, c.id)}
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

          <div className="mt-4 flex items-center gap-3">
            <span className="text-xs" style={{ color: '#8A7F73' }}>진행률</span>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={g.progress}
              onChange={(e) => update(g.id, { progress: Number(e.target.value) })}
              className="flex-1"
              style={{ accentColor: STATUS_COLOR[g.status] }}
            />
            <span className="display italic text-sm tabular-nums" style={{ color: '#2B2620', minWidth: '3rem', textAlign: 'right' }}>
              {g.progress}%
            </span>
          </div>
        </div>
      ))}

      <div className="flex items-center gap-2 pt-2">
        <input
          type="text"
          placeholder="새 목표 제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          className="flex-1 rounded-md px-3 py-2 text-sm outline-none"
          style={{ border: '1px solid #EFE7D4', background: '#FFFDF6' }}
        />
        <button
          onClick={add}
          className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm transition"
          style={{ background: '#2B2620', color: '#FFFBF3' }}
        >
          <Plus size={14} /> 목표 추가
        </button>
      </div>
    </div>
  );
}
