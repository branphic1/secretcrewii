'use client';

import { useState } from 'react';
import { X, Timer } from 'lucide-react';
import CategoryPicker from './CategoryPicker.jsx';

const PRESETS = [15, 25, 30, 45, 60, 90, 120];

export default function TimerStartDialog({ categories, onClose, onStart, defaultTaskName = '' }) {
  const [catId, setCatId] = useState(categories[0]?.id ?? '');
  const [minutes, setMinutes] = useState(25);
  const [taskName, setTaskName] = useState(defaultTaskName);

  const submit = (e) => {
    e?.preventDefault?.();
    if (!catId || !minutes || minutes <= 0) return;
    onStart({ categoryId: catId, planMinutes: Number(minutes), taskName: taskName.trim() });
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50"
      style={{ background: 'rgba(28,25,23,0.35)' }}
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="rounded-lg w-full max-w-md fade-in"
        style={{ background: '#FAF8F3', border: '1px solid #E7E5E0' }}
      >
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid #E7E5E0' }}>
          <h3 className="display italic text-lg inline-flex items-center gap-2" style={{ color: '#1C1917' }}>
            <Timer size={16} /> 타이머 시작
          </h3>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-stone-100" style={{ color: '#78716C' }}>
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs block mb-1" style={{ color: '#78716C' }}>카테고리</label>
            <CategoryPicker categories={categories} value={catId} onChange={setCatId} />
          </div>

          <div>
            <label className="text-xs block mb-1" style={{ color: '#78716C' }}>작업 이름 (선택)</label>
            <input
              type="text"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="예: 경쟁사 3곳 주요 변동 체크"
              className="w-full rounded-md px-3 py-2 text-sm outline-none"
              style={{ border: '1px solid #E7E5E0', background: '#fff' }}
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs block mb-2" style={{ color: '#78716C' }}>시간 (분)</label>
            <div className="flex flex-wrap gap-1 mb-2">
              {PRESETS.map((m) => {
                const on = minutes === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMinutes(m)}
                    className="px-3 py-1.5 text-xs rounded-md transition"
                    style={{
                      background: on ? '#1C1917' : 'transparent',
                      color: on ? '#FAF8F3' : '#57534E',
                      border: `1px solid ${on ? '#1C1917' : '#E7E5E0'}`,
                    }}
                  >
                    {m < 60 ? `${m}분` : `${m / 60}시간${m % 60 ? ` ${m % 60}분` : ''}`}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="600"
                step="1"
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                className="rounded-md px-3 py-2 text-sm outline-none"
                style={{ border: '1px solid #E7E5E0', background: '#fff', width: '6rem' }}
              />
              <span className="text-xs" style={{ color: '#78716C' }}>분</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3" style={{ borderTop: '1px solid #E7E5E0' }}>
          <button
            type="button"
            onClick={onClose}
            className="text-sm px-3 py-1.5 rounded-md transition"
            style={{ color: '#57534E', border: '1px solid #E7E5E0' }}
          >
            취소
          </button>
          <button
            type="submit"
            className="text-sm px-3 py-1.5 rounded-md transition inline-flex items-center gap-1"
            style={{ background: '#1C1917', color: '#FAF8F3' }}
          >
            <Timer size={12} /> 시작
          </button>
        </div>
      </form>
    </div>
  );
}
